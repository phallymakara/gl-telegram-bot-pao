from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_db
from app.api.schemas import OrderCreate, OrderResponse, OrderReturnRequest, StockReturnResponse
from app.models.customer import Customer
from app.models.order import Order
from app.services.order_service import cancel_order_sync, return_order_sync

router = APIRouter()


from uuid import uuid4
from decimal import Decimal


def _to_order_response(o: Order) -> OrderResponse:
    cname = o.customer_name or (o.customer.display_name if o.customer else o.username)
    return OrderResponse(
        id=o.id,
        order_no=o.order_no,
        customer_name=cname,
        group_name=o.group.group_name if o.group else None,
        slot_date=o.slot.slot_date if o.slot else None,
        quantity=o.quantity,
        premium=o.premium,
        premium_amount=o.premium_amount,
        transaction_type=o.transaction_type,
        status=o.status,
        channel=o.channel or ("TELEGRAM" if o.telegram_user_id else "WALK_IN"),
        telegram_user_id=o.telegram_user_id,
        username=o.username,
        spot_price=o.spot_price,
        total_amount=o.total_amount,
        created_at=o.created_at,
    )


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    order_no = body.order_no
    if not order_no:
        prefix = "ORD-B" if body.transaction_type.upper() == "BUY" else "ORD-S"
        order_no = f"{prefix}-{uuid4().hex[:8].upper()}"

    existing = db.query(Order).filter(Order.order_no == order_no).first()
    if existing:
        order_no = f"{order_no}-{uuid4().hex[:4].upper()}"

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

    premium_amount = body.quantity * body.premium
    spot_price = body.spot_price or Decimal("4376.2")
    total_amount = body.total_amount or (body.quantity * (spot_price * Decimal("32.148") + body.premium))

    order = Order(
        order_no=order_no,
        customer_id=customer.id if customer else None,
        quantity=body.quantity,
        premium=body.premium,
        premium_amount=premium_amount,
        transaction_type=body.transaction_type.upper(),
        status="COMPLETED",
        channel=body.channel or "TELEGRAM",
        customer_name=body.customer_name,
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
    o = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.group),
        joinedload(Order.slot),
    ).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return _to_order_response(o)


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(order_id: int, body: OrderCreate, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")

    if body.customer_name:
        o.customer_name = body.customer_name
    if body.quantity is not None:
        o.quantity = body.quantity
    if body.premium is not None:
        o.premium = body.premium
        o.premium_amount = body.quantity * body.premium
    if body.spot_price is not None:
        o.spot_price = body.spot_price
    if body.total_amount is not None:
        o.total_amount = body.total_amount
    else:
        spot_price = body.spot_price or o.spot_price or Decimal("4376.2")
        o.total_amount = body.quantity * (spot_price * Decimal("32.148") + body.premium)
    if body.channel:
        o.channel = body.channel

    db.commit()
    db.refresh(o)
    return _to_order_response(o)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(o)
    db.commit()
    return None


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    try:
        cancel_order_sync(order_id)
    except ValueError as e:
        o = db.query(Order).filter(Order.id == order_id).first()
        if not o:
            raise HTTPException(status_code=404, detail="Order not found")
        o.status = "CANCELLED"
        db.commit()
        db.refresh(o)
    return get_order(order_id, db)


@router.post("/{order_id}/return", response_model=StockReturnResponse)
def return_order(order_id: int, body: OrderReturnRequest, db: Session = Depends(get_db)):
    try:
        stock_return = return_order_sync(order_id, body.quantity, body.reason)
    except ValueError as e:
        message = str(e)
        code = 404 if "not found" in message else 409
        raise HTTPException(status_code=code, detail=message)
    return stock_return
