from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_db
from app.api.schemas import OrderResponse
from app.models.order import Order

router = APIRouter()


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
