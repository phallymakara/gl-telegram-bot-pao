from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.api.schemas import DashboardStats, RevenuePoint
from app.models.order import Order
from app.models.slot_table import SlotTable

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    today = date.today()
    total_gold = db.query(func.coalesce(func.sum(SlotTable.stock), 0)).scalar()
    total_orders = db.query(func.count(Order.id)).scalar()
    sold_today = db.query(func.count(Order.id)).filter(
        Order.transaction_type == "SELL",
        func.date(Order.created_at) == today,
    ).scalar()
    buy_today = db.query(func.count(Order.id)).filter(
        Order.transaction_type == "BUY",
        func.date(Order.created_at) == today,
    ).scalar()
    total_buy_kg = db.query(func.coalesce(func.sum(Order.quantity), 0)).filter(
        Order.transaction_type == "BUY"
    ).scalar()
    total_sell_kg = db.query(func.coalesce(func.sum(Order.quantity), 0)).filter(
        Order.transaction_type == "SELL"
    ).scalar()
    return DashboardStats(
        total_gold=total_gold,
        total_orders=total_orders,
        sold_today=sold_today,
        buy_today=buy_today,
        total_buy_kg=total_buy_kg,
        total_sell_kg=total_sell_kg,
    )


@router.get("/revenue", response_model=list[RevenuePoint])
def get_revenue(range: str = "week", db: Session = Depends(get_db)):
    today = date.today()
    if range == "week":
        start = today - timedelta(days=6)
    elif range == "month":
        start = today - timedelta(days=29)
    else:
        start = today - timedelta(days=6)
    rows = (
        db.query(
            func.date(Order.created_at).label("day"),
            func.sum(Order.premium_amount).filter(Order.transaction_type == "BUY").label("buy"),
            func.sum(Order.premium_amount).filter(Order.transaction_type == "SELL").label("sell"),
        )
        .filter(func.date(Order.created_at) >= start)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )
    return [RevenuePoint(day=str(r.day), buy=r.buy or 0, sell=r.sell or 0) for r in rows]
