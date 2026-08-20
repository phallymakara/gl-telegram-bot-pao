"""
Customer Orders API routes.
Provides endpoints for creating, querying, updating, cancelling, and returning customer gold orders (BUY / SELL).
"""

from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_db
from app.api.schemas import OrderCreate, OrderUpdate, OrderResponse, OrderReturnRequest, StockReturnResponse
from app.models.customer import Customer
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.services.order_service import cancel_order_sync, return_order_sync
from app.services.slot_service import compute_sell_reservation_sync, credit_store_stock_sync, deduct_store_stock_sync
from app.utils.generators import generate_order_no
from app.utils.pricing import DEFAULT_SPOT_PRICE, calculate_order_total, calculate_premium_amount

OPEN_ORDER_STATUSES = ("CONFIRMED", "PENDING", "PROCESSING")
COLLECTED_STATUSES = ("COLLECTED", "COMPLETED", "DELIVERED")

router = APIRouter()


def _to_order_response(o: Order) -> OrderResponse:
    """Helper mapper converting Order model entity to OrderResponse DTO schema."""
    cname = o.customer_name or (o.customer.display_name if o.customer else o.username)
    return OrderResponse(
        id=o.id,
        order_no=o.order_no,
        customer_name=cname,
        sales_person=o.sales_person,
        group_name=o.group.group_name if o.group else None,
        slot_date=o.slot.slot_date if o.slot else None,
        slot_date_str=o.slot_date_str or (o.created_at.strftime("%Y-%m-%d") if o.created_at else None),
        quantity=o.quantity,
        premium=o.premium,
        premium_amount=o.premium_amount,
        transaction_type=o.transaction_type,
        status=o.status,
        channel=o.channel or ("TELEGRAM" if o.telegram_user_id else "WALK_IN"),
        region=o.region or "LOCAL",
        telegram_user_id=o.telegram_user_id,
        username=o.username,
        spot_price=o.spot_price,
        total_amount=o.total_amount,
        created_at=o.created_at,
    )


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    """
    Create a new manual or admin platform order.
    Generates unique order number (ORD-S / ORD-B), registers customer if needed,
    and calculates total amount using standard Troy Ounce pricing formula.
    """
    order_no = body.order_no
    if not order_no:
        # Generate prefix based on transaction type (ORD-S for SELL, ORD-B for BUY)
        order_no = generate_order_no(body.transaction_type)

    # Ensure order_no uniqueness in case of collision
    existing = db.query(Order).filter(Order.order_no == order_no).first()
    if existing:
        order_no = f"{order_no}-{uuid4().hex[:4].upper()}"

    # Auto-lookup or register customer by name if provided
    customer = None
    if body.customer_name:
        customer = (
            db.query(Customer)
            .filter(Customer.display_name == body.customer_name)
            .first()
        )
        if not customer:
            customer = Customer(
                username=body.customer_name,
                display_name=body.customer_name,
            )
            db.add(customer)
            db.flush()

    # Perform price calculations using standard shared pricing utilities
    spot_price = body.spot_price or DEFAULT_SPOT_PRICE
    premium_amount = calculate_premium_amount(body.quantity, body.premium)
    total_amount = body.total_amount or calculate_order_total(body.quantity, spot_price, body.premium)

    txn_type = body.transaction_type.upper()

    # SELL orders don't move any gold yet -- they just promise it to a customer. Nothing physical
    # happens until the order is actually collected (see update_order below); creating one only needs
    # to check it can be covered: FIFO-simulate this order joining the queue of everything already
    # open, against incoming PO stock (any PO dated on/before this order's date) and each table's
    # general stock (capped at what's actually been received into the vault -- a table's STOCK box
    # alone proves nothing arrived), properly sharing both pools with every other currently-open
    # order instead of checking against the raw total in isolation.
    if txn_type == "SELL" and body.quantity:
        _, _, hyp_incoming, hyp_stock, hyp_shortfall = compute_sell_reservation_sync(
            hypothetical_quantity=float(body.quantity),
            hypothetical_slot_date=body.slot_date_str,
        )
        if hyp_shortfall > 0:
            covered = float(body.quantity) - hyp_shortfall
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Insufficient stock: only {covered:.3f}kg of this {float(body.quantity):.3f}kg order can be "
                    f"covered ({hyp_incoming:.3f}kg from incoming PO stock dated on/before "
                    f"{body.slot_date_str or 'unspecified'}, {hyp_stock:.3f}kg from vault-backed table stock), "
                    f"net of what's already reserved by other open orders"
                ),
            )

    region_val = body.region or ("OVERSEAS" if (body.channel and body.channel.upper() in ("OVERSEA", "OVERSEAS")) else "LOCAL")
    order = Order(
        order_no=order_no,
        customer_id=customer.id if customer else None,
        quantity=body.quantity,
        premium=body.premium,
        premium_amount=premium_amount,
        transaction_type=txn_type,
        status=(body.status or "CONFIRMED").upper(),
        channel=body.channel or "TELEGRAM",
        region=region_val,
        customer_name=body.customer_name,
        sales_person=body.sales_person,
        spot_price=spot_price,
        total_amount=total_amount,
        username=body.customer_name,
        slot_date_str=body.slot_date_str,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return _to_order_response(order)


@router.get("/", response_model=list[OrderResponse])
def list_orders(
    search: str = "",
    status_filter: str = "",
    order_type: str = "",
    channel: str = "",
    db: Session = Depends(get_db),
):
    """
    Retrieve list of orders with eager-loaded customer, group, and slot relations.
    Supports filtering by search (order_no), status_filter, order_type (BUY/SELL), and channel.
    Limits output to latest 200 records.
    """
    q = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.group),
        joinedload(Order.slot),
    )
    if order_type:
        q = q.filter(Order.transaction_type == order_type.upper())
    if status_filter:
        q = q.filter(Order.status == status_filter.upper())
    if channel:
        q = q.filter(Order.channel == channel.upper())
    if search:
        q = q.filter(Order.order_no.ilike(f"%{search}%"))
    q = q.order_by(Order.created_at.desc()).limit(200)
    return [_to_order_response(o) for o in q.all()]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """
    Retrieve single order detail by order ID.
    Raises HTTP 404 if the order does not exist.
    """
    o = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.group),
        joinedload(Order.slot),
    ).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _to_order_response(o)


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(order_id: int, body: OrderUpdate, db: Session = Depends(get_db)):
    """
    Update details of an existing order by ID and recalculate total amounts.
    If a SELL order's status is moving into a collected state for the first time, this is the moment
    gold actually leaves the vault: it deducts physical stock (drawing from that date's incoming PO
    stock first, same as the create-time availability check considered), same as receiving a PO is
    the moment gold actually enters it.
    """
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    was_collected = o.status in COLLECTED_STATUSES
    newly_collected = (
        body.status is not None
        and body.status.upper() in COLLECTED_STATUSES
        and not was_collected
    )

    if body.customer_name is not None:
        o.customer_name = body.customer_name
    if body.sales_person is not None:
        o.sales_person = body.sales_person
    if body.quantity is not None:
        o.quantity = body.quantity
    if body.premium is not None:
        o.premium = body.premium
        o.premium_amount = calculate_premium_amount(o.quantity, body.premium)
    if body.spot_price is not None:
        o.spot_price = body.spot_price

    if body.total_amount is not None:
        o.total_amount = body.total_amount
    elif body.quantity is not None or body.spot_price is not None or body.premium is not None:
        spot_price = body.spot_price or o.spot_price or DEFAULT_SPOT_PRICE
        o.total_amount = calculate_order_total(o.quantity, spot_price, o.premium)

    if body.channel is not None:
        o.channel = body.channel
    if body.region is not None:
        o.region = body.region
    elif body.channel is not None and body.channel.upper() in ("OVERSEA", "OVERSEAS"):
        o.region = "OVERSEAS"
    if body.slot_date_str is not None:
        o.slot_date_str = body.slot_date_str
    if body.status is not None:
        o.status = body.status.upper()

    db.commit()
    db.refresh(o)

    if newly_collected and o.transaction_type == "SELL" and o.quantity:
        deducted = deduct_store_stock_sync(
            quantity=float(o.quantity),
            store_type="SELL",
            slot_date=o.slot_date_str,
            txn_type="ORDER_COLLECT_DEDUCT",
            remark=f"Collected sell order {o.order_no}",
            order_id=o.id,
        )
        if not deducted:
            # Roll the status change back -- can't mark it collected if the gold it was promised
            # against (stock + that date's incoming) is no longer actually there.
            o.status = "CONFIRMED"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot collect: insufficient physical stock and incoming gold to cover this order.",
            )
        db.refresh(o)

    return _to_order_response(o)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """
    Delete an order by ID.
    Reverses the physical stock deduction if the deleted order had already been collected
    (gold only actually leaves the vault at collection time -- see update_order).
    Returns HTTP 204 No Content upon deletion.
    """
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    txn_type, quantity, order_no = o.transaction_type, o.quantity, o.order_no
    was_collected = o.status in COLLECTED_STATUSES
    # Detach audit log entries so the FK on inventory_transactions.order_id doesn't block the delete.
    db.query(InventoryTransaction).filter(InventoryTransaction.order_id == order_id).update({"order_id": None})
    db.delete(o)
    db.commit()

    if was_collected and txn_type == "SELL" and quantity:
        credit_store_stock_sync(
            quantity=float(quantity),
            store_type="SELL",
            txn_type="ORDER_DELETE_RESTOCK",
            remark=f"Deleted collected sell order {order_no}",
        )
    return None


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    """
    Cancel an active order. Only reverses physical stock if the order had already been collected --
    an order still CONFIRMED/PENDING never touched physical stock in the first place (see create_order).
    """
    existing = db.query(Order).filter(Order.id == order_id).first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    was_collected = existing.status in COLLECTED_STATUSES
    txn_type, quantity, order_no = existing.transaction_type, existing.quantity, existing.order_no

    try:
        cancel_order_sync(order_id)
    except ValueError as e:
        o = db.query(Order).filter(Order.id == order_id).first()
        if not o:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        o.status = "CANCELLED"
        db.commit()
        db.refresh(o)

    if was_collected and txn_type == "SELL" and quantity:
        credit_store_stock_sync(
            quantity=float(quantity),
            store_type="SELL",
            txn_type="ORDER_CANCEL_RESTOCK",
            remark=f"Cancelled collected sell order {order_no}",
            order_id=order_id,
        )
    # cancel_order_sync commits through its own session, so this session's identity map
    # (populated by the `existing` lookup above) is stale until expired.
    db.expire_all()
    return get_order(order_id, db)


@router.post("/{order_id}/return", response_model=StockReturnResponse)
def return_order(order_id: int, body: OrderReturnRequest, db: Session = Depends(get_db)):
    """
    Process stock return for an order (customer returns gold back to store stock).
    Delegates transaction processing to order_service.
    """
    try:
        stock_return = return_order_sync(order_id, body.quantity, body.reason)
    except ValueError as e:
        message = str(e)
        code = status.HTTP_404_NOT_FOUND if "not found" in message else status.HTTP_409_CONFLICT
        raise HTTPException(status_code=code, detail=message)
    return stock_return

