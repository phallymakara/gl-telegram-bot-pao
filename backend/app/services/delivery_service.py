"""
Delivery Note and Payment Collection Domain Service.
Implements business rules for Delivery Note generation from completed sales,
partial gold deliveries tracking, payment collection logging, automatic balance calculations, and payment status transitions.
"""

import logging
from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.delivery_note import DeliveryNote
from app.models.delivery_payment import DeliveryPayment
from app.models.order import Order
from app.schemas.delivery_note import DeliveryNoteCreate, DeliveryNoteUpdate, DeliveryPaymentCreate
from app.utils.generators import generate_delivery_no

logger = logging.getLogger(__name__)

# Sales statuses that indicate the order has physically gone out / completed
ELIGIBLE_SALE_STATUSES = ("COMPLETED", "COLLECTED", "DELIVERED")


def recalculate_delivery_note_financials(delivery_note: DeliveryNote) -> None:
    """
    Recalculates amount_paid, outstanding_balance, and updates payment_status based on
    all logged individual payment collections.

    Rules:
    - If amount_paid == 0: status is WAITING_PAYMENT
    - If 0 < amount_paid < amount_owed: status is PARTIALLY_PAID
    - If amount_paid >= amount_owed: status is PAID
    """
    total_paid = sum((Decimal(str(p.amount)) for p in delivery_note.payments), Decimal("0.00"))
    delivery_note.amount_paid = total_paid

    owed = Decimal(str(delivery_note.amount_owed))
    remaining = owed - total_paid
    delivery_note.outstanding_balance = max(Decimal("0.00"), remaining)

    if total_paid <= Decimal("0.00"):
        delivery_note.payment_status = "WAITING_PAYMENT"
    elif total_paid < owed:
        delivery_note.payment_status = "PARTIALLY_PAID"
    else:
        delivery_note.payment_status = "PAID"


def get_eligible_sales_orders(db: Session) -> list[dict]:
    """
    Retrieves customer SELL orders that still have remaining undelivered gold quantity.
    Calculates already-dispatched gold quantity and remaining gold quantity per order.
    """
    # Sum dispatched gold per order from existing delivery notes
    dispatched_subq = (
        db.query(
            DeliveryNote.order_id,
            func.coalesce(func.sum(DeliveryNote.gold_quantity), Decimal("0.000")).label("total_dispatched"),
        )
        .group_by(DeliveryNote.order_id)
        .subquery()
    )

    orders = (
        db.query(
            Order,
            func.coalesce(dispatched_subq.c.total_dispatched, Decimal("0.000")).label("dispatched_quantity"),
        )
        .outerjoin(dispatched_subq, Order.id == dispatched_subq.c.order_id)
        .filter(
            Order.transaction_type == "SELL",
            Order.status.in_(ELIGIBLE_SALE_STATUSES),
        )
        .order_by(Order.created_at.desc())
        .all()
    )

    results = []
    for order, dispatched_qty in orders:
        ordered_qty = Decimal(str(order.quantity or 0))
        dispatched_decimal = Decimal(str(dispatched_qty or 0))
        remaining = max(Decimal("0.000"), ordered_qty - dispatched_decimal)

        # Only include orders that still have remaining gold to deliver
        if remaining > Decimal("0.000"):
            results.append({
                "order": order,
                "dispatched_quantity": dispatched_decimal,
                "remaining_quantity": remaining,
            })

    return results


def create_delivery_note_sync(db: Session, data: DeliveryNoteCreate) -> DeliveryNote:
    """
    Creates a new Delivery Note for an eligible customer sale.
    Supports partial gold deliveries against the sale order (e.g. 2 KG in DO #1, 3 KG in DO #2).

    Enforces:
    - Rule 1: Only created for completed/delivered customer sales (SELL).
    - Rule 2: Cannot dispatch more gold than the order's remaining undelivered balance.
    - Proportional financial amount calculation for partial gold deliveries.
    - Auto calculates initial balances and sets payment status to WAITING_PAYMENT.
    """
    # 1. Fetch the order
    order = (
        db.query(Order)
        .options(joinedload(Order.customer))
        .filter(Order.id == data.order_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {data.order_id} not found.",
        )

    # 2. Rule 1: Sale must be a completed/delivered SELL transaction
    if order.transaction_type != "SELL":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delivery Notes can only be created for customer sales (SELL transactions), got {order.transaction_type}.",
        )

    if order.status not in ELIGIBLE_SALE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delivery Note can only be created for a sale that has gone out to the customer ({', '.join(ELIGIBLE_SALE_STATUSES)}). Order {order.order_no} is currently {order.status}.",
        )

    # 3. Rule 2: Compute remaining undelivered gold balance for this order
    existing_dispatched = (
        db.query(func.coalesce(func.sum(DeliveryNote.gold_quantity), Decimal("0.000")))
        .filter(DeliveryNote.order_id == data.order_id)
        .scalar()
    )
    already_dispatched = Decimal(str(existing_dispatched or 0))
    ordered_total_qty = Decimal(str(order.quantity or 0))
    remaining_gold = max(Decimal("0.000"), ordered_total_qty - already_dispatched)

    if remaining_gold <= Decimal("0.000"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order {order.order_no} is already fully delivered ({float(already_dispatched):.3f} KG dispatched across previous Delivery Notes).",
        )

    # 4. Determine gold quantity to dispatch in this Delivery Note
    gold_qty = Decimal(str(data.gold_quantity)) if data.gold_quantity is not None else remaining_gold
    if gold_qty <= Decimal("0.000"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dispatched gold quantity must be greater than zero.",
        )

    if gold_qty > remaining_gold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot dispatch {float(gold_qty):.3f} KG. Only {float(remaining_gold):.3f} KG remaining "
                f"to deliver for order {order.order_no} (Total: {float(ordered_total_qty):.3f} KG, "
                f"Already Dispatched: {float(already_dispatched):.3f} KG)."
            ),
        )

    # 5. Proportional Amount Owed calculation (dispatched gold / total gold * total amount)
    if data.amount_owed is not None:
        amount_owed = Decimal(str(data.amount_owed))
    else:
        if order.total_amount and ordered_total_qty > Decimal("0.000"):
            unit_price = Decimal(str(order.total_amount)) / ordered_total_qty
            amount_owed = (unit_price * gold_qty).quantize(Decimal("0.01"))
        else:
            amount_owed = Decimal("0.00")

    customer_name = order.customer_name or (order.customer.display_name if order.customer else order.username)
    dispatch_date = data.dispatch_date or date.today()
    goods_delivered = data.goods_delivered or f"Gold Bullion {float(gold_qty):.3f} KG"

    delivery_no = generate_delivery_no()

    delivery_note = DeliveryNote(
        delivery_no=delivery_no,
        order_id=order.id,
        customer_id=order.customer_id,
        customer_name=customer_name,
        recipient_name=data.recipient_name,
        delivery_address=data.delivery_address,
        driver_contact=data.driver_contact,
        goods_delivered=goods_delivered,
        gold_quantity=gold_qty,
        amount_owed=amount_owed,
        amount_paid=Decimal("0.00"),
        outstanding_balance=amount_owed,
        payment_status="WAITING_PAYMENT",
        courier_status=data.courier_status or "Dispatched",
        dispatch_date=dispatch_date,
        notes=data.notes,
    )

    db.add(delivery_note)
    db.flush()

    # If an initial collection amount was recorded during DO creation (Outstanding Amount mode)
    if data.collected_amount is not None and Decimal(str(data.collected_amount)) > Decimal("0.00"):
        init_collected = Decimal(str(data.collected_amount))
        actual_paid = min(init_collected, amount_owed)
        initial_payment = DeliveryPayment(
            delivery_note_id=delivery_note.id,
            amount=actual_paid,
            payment_date=dispatch_date,
            collected_by=data.driver_contact or "Staff Collection",
            payment_method="CASH",
            reference_note="Initial collection on delivery note creation",
        )
        db.add(initial_payment)
        db.flush()
        delivery_note.payments = [initial_payment]
        recalculate_delivery_note_financials(delivery_note)

    db.commit()
    db.refresh(delivery_note)

    logger.info(
        "Created Delivery Note %s for Order %s (Dispatched: %s/%s KG, Owed: %s USD, Paid: %s USD)",
        delivery_note.delivery_no,
        order.order_no,
        gold_qty,
        ordered_total_qty,
        amount_owed,
        delivery_note.amount_paid,
    )
    return delivery_note


def record_payment_collection_sync(
    db: Session,
    delivery_note_id: int,
    data: DeliveryPaymentCreate,
) -> tuple[DeliveryNote, DeliveryPayment]:
    """
    Records an individual payment collection against a Delivery Note.

    Enforces:
    - Rule 3: Every payment collected is logged as an immutable individual record.
    - Rule 4: Outstanding balance is automatically updated (amount owed minus total collected).
    - Rule 5: Delivery Note's status updates on its own (WAITING_PAYMENT / PARTIALLY_PAID / PAID).
    - Rule 6: Prevent collecting more money than is actually owed.
    """
    delivery_note = (
        db.query(DeliveryNote)
        .options(joinedload(DeliveryNote.payments))
        .filter(DeliveryNote.id == delivery_note_id)
        .first()
    )
    if not delivery_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery Note with ID {delivery_note_id} not found.",
        )

    payment_amt = Decimal(str(data.amount))
    if payment_amt <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero.",
        )

    # Calculate current balance before this payment
    total_paid_so_far = sum((Decimal(str(p.amount)) for p in delivery_note.payments), Decimal("0.00"))
    owed = Decimal(str(delivery_note.amount_owed))
    current_outstanding = max(Decimal("0.00"), owed - total_paid_so_far)

    # Rule 6: Prevent overpayment
    if payment_amt > current_outstanding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Payment amount (${payment_amt:,.2f}) exceeds outstanding balance "
                f"(${current_outstanding:,.2f}) on Delivery Note {delivery_note.delivery_no}."
            ),
        )

    # Rule 3: Create individual immutable payment log
    payment = DeliveryPayment(
        delivery_note_id=delivery_note.id,
        amount=payment_amt,
        payment_date=data.payment_date or date.today(),
        collected_by=data.collected_by,
        payment_method=data.payment_method or "CASH",
        reference_note=data.reference_note,
    )
    db.add(payment)
    db.flush()

    # Refresh payments relationship and recalculate totals
    delivery_note.payments.append(payment)
    recalculate_delivery_note_financials(delivery_note)

    db.commit()
    db.refresh(delivery_note)
    db.refresh(payment)

    logger.info(
        "Recorded payment of %s USD for Delivery Note %s by %s. New Balance: %s USD (Status: %s)",
        payment_amt,
        delivery_note.delivery_no,
        data.collected_by,
        delivery_note.outstanding_balance,
        delivery_note.payment_status,
    )
    return delivery_note, payment


def calculate_partial_delivery_sync(
    db: Session,
    order_id: int,
    dispatch_quantity: Decimal,
) -> dict:
    """
    Server-side formula calculation for partial gold delivery against a customer sale order.
    Calculates total ordered, delivered so far, remaining quantity after current dispatch,
    and proportional amount owed.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found.",
        )

    # 1. Delivered so far from existing delivery notes
    existing_dispatched = (
        db.query(func.coalesce(func.sum(DeliveryNote.gold_quantity), Decimal("0.000")))
        .filter(DeliveryNote.order_id == order_id)
        .scalar()
    )
    already_dispatched = Decimal(str(existing_dispatched or 0))
    ordered_total_qty = Decimal(str(order.quantity or 0))
    max_remaining = max(Decimal("0.000"), ordered_total_qty - already_dispatched)

    # 2. Current dispatch quantity & remaining after dispatch
    qty = Decimal(str(dispatch_quantity or 0))
    remaining_after = max(Decimal("0.000"), max_remaining - qty)

    # 3. Server-side proportional amount calculation
    if order.total_amount and ordered_total_qty > Decimal("0.000"):
        unit_price = Decimal(str(order.total_amount)) / ordered_total_qty
        amount_owed = (unit_price * qty).quantize(Decimal("0.01"))
    else:
        amount_owed = Decimal("0.00")

    # 4. Validity checks
    is_valid = (Decimal("0.000") < qty <= max_remaining)
    msg = None
    if qty <= Decimal("0.000"):
        msg = "Quantity to deliver must be greater than zero."
    elif qty > max_remaining:
        msg = f"Cannot dispatch {float(qty):.3f} KG. Only {float(max_remaining):.3f} KG remaining to deliver."

    return {
        "order_id": order.id,
        "order_no": order.order_no,
        "total_ordered_quantity": ordered_total_qty,
        "delivered_so_far_quantity": already_dispatched,
        "dispatch_quantity": qty,
        "remaining_quantity_after_dispatch": remaining_after,
        "proportional_amount_owed": amount_owed,
        "is_valid": is_valid,
        "message": msg,
    }
