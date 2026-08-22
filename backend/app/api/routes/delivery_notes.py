"""
Delivery Notes and Payment Collections API routes.
Provides endpoints for creating, querying, updating, and recording payment collections for customer Delivery Notes.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_db
from app.api.schemas import (
    DeliveryNoteCreate,
    DeliveryNoteDetailResponse,
    DeliveryNoteResponse,
    DeliveryNoteUpdate,
    DeliveryPaymentCreate,
    DeliveryPaymentResponse,
    EligibleOrderResponse,
    PartialDeliveryCalculationRequest,
    PartialDeliveryCalculationResponse,
)
from app.models.delivery_note import DeliveryNote
from app.models.delivery_payment import DeliveryPayment
from app.services.delivery_service import (
    calculate_partial_delivery_sync,
    create_delivery_note_sync,
    get_eligible_sales_orders,
    recalculate_delivery_note_financials,
    record_payment_collection_sync,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _to_delivery_response(dn: DeliveryNote) -> DeliveryNoteResponse:
    """Helper mapper converting DeliveryNote model entity to DeliveryNoteResponse DTO schema."""
    order_qty = dn.order.quantity if dn.order else None
    order_amt = dn.order.total_amount if dn.order else None
    is_fully_paid = (dn.outstanding_balance <= 0)
    is_fully_delivered = bool(order_qty and dn.gold_quantity >= order_qty)

    return DeliveryNoteResponse(
        id=dn.id,
        delivery_no=dn.delivery_no,
        order_id=dn.order_id,
        order_no=dn.order.order_no if dn.order else f"ORD-{dn.order_id}",
        customer_id=dn.customer_id,
        customer_name=dn.customer_name,
        recipient_name=dn.recipient_name,
        delivery_address=dn.delivery_address,
        driver_contact=dn.driver_contact,
        goods_delivered=dn.goods_delivered,
        gold_quantity=dn.gold_quantity,
        order_quantity=order_qty,
        order_total_amount=order_amt,
        amount_owed=dn.amount_owed,
        amount_paid=dn.amount_paid,
        outstanding_balance=dn.outstanding_balance,
        payment_status=dn.payment_status,
        courier_status=dn.courier_status,
        dispatch_date=dn.dispatch_date,
        notes=dn.notes,
        created_at=dn.created_at,
        payments_count=len(dn.payments) if dn.payments is not None else 0,
        order_is_fully_delivered=is_fully_delivered,
        order_is_fully_paid=is_fully_paid,
    )


def _to_delivery_detail_response(dn: DeliveryNote) -> DeliveryNoteDetailResponse:
    """Helper mapper converting DeliveryNote model entity with payments to DeliveryNoteDetailResponse."""
    order_qty = dn.order.quantity if dn.order else None
    order_amt = dn.order.total_amount if dn.order else None
    is_fully_paid = (dn.outstanding_balance <= 0)
    is_fully_delivered = bool(order_qty and dn.gold_quantity >= order_qty)

    payments_dto = [
        DeliveryPaymentResponse(
            id=p.id,
            delivery_note_id=p.delivery_note_id,
            amount=p.amount,
            payment_date=p.payment_date,
            collected_by=p.collected_by,
            payment_method=p.payment_method,
            reference_note=p.reference_note,
            created_at=p.created_at,
        )
        for p in (dn.payments or [])
    ]
    return DeliveryNoteDetailResponse(
        id=dn.id,
        delivery_no=dn.delivery_no,
        order_id=dn.order_id,
        order_no=dn.order.order_no if dn.order else f"ORD-{dn.order_id}",
        customer_id=dn.customer_id,
        customer_name=dn.customer_name,
        recipient_name=dn.recipient_name,
        delivery_address=dn.delivery_address,
        driver_contact=dn.driver_contact,
        goods_delivered=dn.goods_delivered,
        gold_quantity=dn.gold_quantity,
        order_quantity=order_qty,
        order_total_amount=order_amt,
        amount_owed=dn.amount_owed,
        amount_paid=dn.amount_paid,
        outstanding_balance=dn.outstanding_balance,
        payment_status=dn.payment_status,
        courier_status=dn.courier_status,
        dispatch_date=dn.dispatch_date,
        notes=dn.notes,
        created_at=dn.created_at,
        payments_count=len(payments_dto),
        order_is_fully_delivered=is_fully_delivered,
        order_is_fully_paid=is_fully_paid,
        payments=payments_dto,
    )


@router.get("/eligible-orders", response_model=list[EligibleOrderResponse])
def list_eligible_orders(db: Session = Depends(get_db)):
    """
    Retrieve customer sales (SELL orders) that still have remaining gold to deliver.
    Used by the frontend to populate the Order selector when generating a new Delivery Note.
    """
    items = get_eligible_sales_orders(db)
    results = []
    for item in items:
        o = item["order"]
        results.append(
            EligibleOrderResponse(
                id=o.id,
                order_no=o.order_no,
                customer_name=o.customer_name or (o.customer.display_name if o.customer else o.username),
                quantity=o.quantity,
                dispatched_quantity=item["dispatched_quantity"],
                remaining_quantity=item["remaining_quantity"],
                spot_price=o.spot_price,
                premium=o.premium,
                total_amount=o.total_amount,
                transaction_type=o.transaction_type,
                status=o.status,
                created_at=o.created_at,
                slot_date_str=o.slot_date_str,
            )
        )
    return results


@router.post("/calculate-partial", response_model=PartialDeliveryCalculationResponse)
def calculate_partial_delivery(
    payload: PartialDeliveryCalculationRequest,
    db: Session = Depends(get_db),
):
    """
    Calculate partial delivery formulas server-side.
    Returns total ordered, delivered so far, remaining quantity after dispatch,
    and proportional financial amount owed.
    """
    res = calculate_partial_delivery_sync(
        db=db,
        order_id=payload.order_id,
        dispatch_quantity=payload.dispatch_quantity,
    )
    return PartialDeliveryCalculationResponse(**res)


@router.get("/", response_model=list[DeliveryNoteResponse])
def list_delivery_notes(
    search: str = "",
    payment_status: str = "",
    courier_status: str = "",
    db: Session = Depends(get_db),
):
    """
    Retrieve list of Delivery Notes with payment statuses and outstanding balances.
    Supports filtering by search query (delivery_no, order_no, customer_name, recipient_name),
    payment_status (WAITING_PAYMENT, PARTIALLY_PAID, PAID), and courier_status.
    """
    q = db.query(DeliveryNote).options(
        joinedload(DeliveryNote.order),
        joinedload(DeliveryNote.payments),
    )

    if payment_status:
        q = q.filter(DeliveryNote.payment_status == payment_status.upper())
    if courier_status:
        q = q.filter(DeliveryNote.courier_status == courier_status)
    if search:
        term = f"%{search}%"
        q = q.filter(
            (DeliveryNote.delivery_no.ilike(term))
            | (DeliveryNote.customer_name.ilike(term))
            | (DeliveryNote.recipient_name.ilike(term))
            | (DeliveryNote.delivery_address.ilike(term))
        )

    q = q.order_by(DeliveryNote.created_at.desc())
    notes = q.all()
    return [_to_delivery_response(dn) for dn in notes]


@router.post("/", response_model=DeliveryNoteResponse, status_code=status.HTTP_201_CREATED)
def create_delivery_note(body: DeliveryNoteCreate, db: Session = Depends(get_db)):
    """
    Create a new Delivery Note from a completed customer sale order.
    Enforces that order is completed/delivered and has no existing delivery note.
    """
    delivery_note = create_delivery_note_sync(db, body)
    # Refresh to load relationships
    dn = (
        db.query(DeliveryNote)
        .options(joinedload(DeliveryNote.order), joinedload(DeliveryNote.payments))
        .filter(DeliveryNote.id == delivery_note.id)
        .first()
    )
    return _to_delivery_response(dn or delivery_note)


@router.get("/{delivery_note_id}", response_model=DeliveryNoteDetailResponse)
def get_delivery_note(delivery_note_id: int, db: Session = Depends(get_db)):
    """
    Retrieve single Delivery Note details along with its complete payment collection history log.
    """
    dn = (
        db.query(DeliveryNote)
        .options(
            joinedload(DeliveryNote.order),
            joinedload(DeliveryNote.payments),
        )
        .filter(DeliveryNote.id == delivery_note_id)
        .first()
    )
    if not dn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery Note {delivery_note_id} not found.",
        )
    return _to_detail_response_helper(dn)


def _to_detail_response_helper(dn: DeliveryNote) -> DeliveryNoteDetailResponse:
    # Ensure financials are current
    recalculate_delivery_note_financials(dn)
    return _to_delivery_detail_response(dn)


@router.put("/{delivery_note_id}", response_model=DeliveryNoteResponse)
def update_delivery_note(
    delivery_note_id: int,
    body: DeliveryNoteUpdate,
    db: Session = Depends(get_db),
):
    """
    Update delivery note metadata (courier status, recipient, address, driver, notes).
    """
    dn = (
        db.query(DeliveryNote)
        .options(joinedload(DeliveryNote.order), joinedload(DeliveryNote.payments))
        .filter(DeliveryNote.id == delivery_note_id)
        .first()
    )
    if not dn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery Note {delivery_note_id} not found.",
        )

    if body.recipient_name is not None:
        dn.recipient_name = body.recipient_name
    if body.delivery_address is not None:
        dn.delivery_address = body.delivery_address
    if body.driver_contact is not None:
        dn.driver_contact = body.driver_contact
    if body.courier_status is not None:
        dn.courier_status = body.courier_status
    if body.dispatch_date is not None:
        dn.dispatch_date = body.dispatch_date
    if body.notes is not None:
        dn.notes = body.notes

    db.commit()
    db.refresh(dn)
    return _to_delivery_response(dn)


@router.post("/{delivery_note_id}/payments", response_model=DeliveryPaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment(
    delivery_note_id: int,
    body: DeliveryPaymentCreate,
    db: Session = Depends(get_db),
):
    """
    Record a new payment collection against a Delivery Note.
    Validates amount > 0 and amount <= outstanding balance, appends an immutable payment record,
    and automatically recalculates the note's balance and payment status.
    """
    _, payment = record_payment_collection_sync(db, delivery_note_id, body)
    return DeliveryPaymentResponse(
        id=payment.id,
        delivery_note_id=payment.delivery_note_id,
        amount=payment.amount,
        payment_date=payment.payment_date,
        collected_by=payment.collected_by,
        payment_method=payment.payment_method,
        reference_note=payment.reference_note,
        created_at=payment.created_at,
    )


@router.delete("/{delivery_note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_delivery_note(delivery_note_id: int, db: Session = Depends(get_db)):
    """
    Delete a Delivery Note and its payment records.
    """
    dn = db.query(DeliveryNote).filter(DeliveryNote.id == delivery_note_id).first()
    if not dn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery Note {delivery_note_id} not found.",
        )
    db.delete(dn)
    db.commit()
    return None
