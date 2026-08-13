from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_db
from app.api.schemas import OrderCreate, OrderResponse, OrderReturnRequest, StockReturnResponse
from app.models.customer import Customer
from app.models.order import Order
from app.services.order_service import cancel_order_sync, return_order_sync

router = APIRouter()


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    existing = db.query(Order).filter(Order.order_no == body.order_no).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Order {body.order_no} already exists")

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

    order = Order(
        order_no=body.order_no,
        customer_id=customer.id if customer else None,
        quantity=body.quantity,
        premium=body.premium,
        premium_amount=body.quantity * body.premium,
        transaction_type=body.transaction_type.upper(),
        status="COMPLETED",
        username=body.customer_name,
        slot_date_str=body.slot_date_str,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return OrderResponse(
        id=order.id,
        order_no=order.order_no,
        customer_name=order.customer.display_name if order.customer else None,
        group_name=order.group.group_name if order.group else None,
        slot_date=order.slot.slot_date if order.slot else None,
        quantity=order.quantity,
        premium=order.premium,
        premium_amount=order.premium_amount,
        transaction_type=order.transaction_type,
        status=order.status,
        created_at=order.created_at,
    )


@router.get("/", response_model=list[OrderResponse])
def list_orders(
    search: str = "",
    status_filter: str = "",
    order_type: str = "",
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
        q = q.filter(Order.status == status_filter)
    if search:
        q = q.filter(Order.order_no.ilike(f"%{search}%"))
    q = q.order_by(Order.created_at.desc()).limit(200)
    orders = q.all()
    result = []
    for o in orders:
        result.append(OrderResponse(
            id=o.id,
            order_no=o.order_no,
            customer_name=o.customer.display_name if o.customer else None,
            group_name=o.group.group_name if o.group else None,
            slot_date=o.slot.slot_date if o.slot else None,
            quantity=o.quantity,
            premium=o.premium,
            premium_amount=o.premium_amount,
            transaction_type=o.transaction_type,
            status=o.status,
            created_at=o.created_at,
        ))
    return result


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.group),
        joinedload(Order.slot),
    ).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderResponse(
        id=o.id,
        order_no=o.order_no,
        customer_name=o.customer.display_name if o.customer else None,
        group_name=o.group.group_name if o.group else None,
        slot_date=o.slot.slot_date if o.slot else None,
        quantity=o.quantity,
        premium=o.premium,
        premium_amount=o.premium_amount,
        transaction_type=o.transaction_type,
        status=o.status,
        created_at=o.created_at,
    )


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    try:
        cancel_order_sync(order_id)
    except ValueError as e:
        message = str(e)
        code = 404 if "not found" in message else 409
        raise HTTPException(status_code=code, detail=message)
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
