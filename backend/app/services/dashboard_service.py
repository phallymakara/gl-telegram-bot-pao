"""
Dashboard Analytics Service.
Calculates high-level admin metrics including gold inventory breakdown, channel sales, buyback volumes, and revenue trend points.
"""

from datetime import date, datetime, timedelta
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.purchase_order import PurchaseOrder
from app.models.slot_table import SlotTable
from app.schemas.dashboard import (
    DashboardStats,
    RevenuePoint,
    DailyBreakdownResponse,
    DailyBreakdownRow,
    DailyGoldFlow,
    DailyGoldOut,
    DailyOrderDetail,
)


def get_effective_order_date(o_or_row) -> date | None:
    """Helper to extract the target order date, prioritizing slot_date_str if specified."""
    slot_str = getattr(o_or_row, "slot_date_str", None)
    if slot_str and isinstance(slot_str, str) and len(slot_str.strip()) >= 10:
        try:
            return datetime.strptime(slot_str.strip()[:10], "%Y-%m-%d").date()
        except ValueError:
            pass
    dt = getattr(o_or_row, "created_at", None) or getattr(o_or_row, "day", None)
    if dt:
        if isinstance(dt, (datetime, date)):
            return dt.date() if isinstance(dt, datetime) else dt
        if isinstance(dt, str):
            try:
                return datetime.strptime(dt.strip()[:10], "%Y-%m-%d").date()
            except ValueError:
                pass
    return None


def calculate_dashboard_stats(db: Session, target_date: str = "") -> DashboardStats:
    """
    Calculate aggregated dashboard statistics.
    Computes total physical gold, incoming PO stock, gold inflows (Overseas/Local/Customer),
    and channel outflows (Telegram/Phone/Walk-in).
    Supports optional target_date filtering for historical inventory simulation.
    """
    today = date.today()
    target_dt: date | None = None
    if target_date and target_date.strip():
        try:
            target_dt = datetime.strptime(target_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            target_dt = None

    target_dt_val = target_dt or today

    total_gold = float(db.query(func.coalesce(func.sum(SlotTable.stock), 0)).scalar() or 0)
    total_orders = int(db.query(func.count(Order.id)).scalar() or 0)
    physical_stock = total_gold

    # Evaluate Order metrics using effective order date (slot_date_str or created_at)
    all_orders = db.query(Order).filter(Order.status != "CANCELLED").all()

    sold_today = 0
    buy_today = 0
    gold_out_overseas = 0.0
    gold_out_platform = 0.0
    gold_out_physical = 0.0
    order_buyback = 0.0

    for o in all_orders:
        d = get_effective_order_date(o)
        if d == target_dt_val:
            txn = (o.transaction_type or "").upper()
            qty = float(o.quantity or 0)
            if txn == "SELL":
                sold_today += 1
                region = (getattr(o, "region", None) or "LOCAL").upper()
                ch = (getattr(o, "channel", None) or "TELEGRAM").upper()
                if region == "OVERSEAS":
                    gold_out_overseas += qty
                elif ch in ("TELEGRAM", "WEB", "PLATFORM") or not ch:
                    gold_out_platform += qty
                else:
                    gold_out_physical += qty
            elif txn == "BUY":
                buy_today += 1
                order_buyback += qty

    gold_out_total = gold_out_overseas + gold_out_platform + gold_out_physical

    # Incoming PO queries (count status INCOMING and CONFIRMED)
    total_inc_q = db.query(func.coalesce(func.sum(PurchaseOrder.quantity), 0)).filter(
        PurchaseOrder.status.in_(["INCOMING", "CONFIRMED"])
    )
    rem_inc_q = db.query(func.coalesce(func.sum(PurchaseOrder.quantity), 0)).filter(
        PurchaseOrder.status.in_(["INCOMING", "CONFIRMED"])
    )

    if target_dt:
        date_match = or_(
            func.date(PurchaseOrder.expected_date) == target_dt,
            func.date(PurchaseOrder.order_date) == target_dt,
            func.date(PurchaseOrder.received_date) == target_dt,
        )
        total_inc_q = total_inc_q.filter(date_match)
        rem_inc_q = rem_inc_q.filter(date_match)

    incoming_po = float(total_inc_q.scalar() or 0)
    remaining_incoming = float(rem_inc_q.scalar() or 0)

    # Gold IN breakdown by source (Oversea POs, Local POs = Platform + Customer Buybacks = Physical)
    po_base = db.query(func.coalesce(func.sum(PurchaseOrder.quantity), 0)).filter(
        PurchaseOrder.status.in_(["INCOMING", "CONFIRMED", "RECEIVED", "COMPLETED"])
    )
    if target_dt:
        po_base = po_base.filter(or_(
            func.date(PurchaseOrder.expected_date) == target_dt,
            func.date(PurchaseOrder.order_date) == target_dt,
            func.date(PurchaseOrder.received_date) == target_dt,
        ))

    gold_in_overseas = float(po_base.filter(
        func.upper(PurchaseOrder.po_type) == "OVERSEA"
    ).scalar() or 0)

    gold_in_local_platform = float(po_base.filter(
        func.upper(PurchaseOrder.po_type) == "LOCAL"
    ).scalar() or 0)

    po_buyback = float(po_base.filter(
        func.upper(PurchaseOrder.po_type) == "BUYBACK"
    ).scalar() or 0)

    gold_in_local_physical = po_buyback + order_buyback
    gold_in_local = gold_in_local_platform + gold_in_local_physical
    gold_in_total = gold_in_overseas + gold_in_local

    # Reserved physical gold calculation (active pending/processing orders)
    reserved = float(db.query(func.coalesce(func.sum(Order.quantity), 0)).filter(
        Order.status.in_(["CONFIRMED", "PENDING", "PROCESSING"])
    ).scalar() or 0)
    available = max(0.0, physical_stock - reserved)

    open_orders = int(db.query(func.count(Order.id)).filter(
        Order.status.in_(["PENDING", "CONFIRMED", "PROCESSING", "OPEN"])
    ).scalar() or 0)

    return DashboardStats(
        total_gold=total_gold,
        total_orders=total_orders,
        sold_today=sold_today,
        buy_today=buy_today,
        total_buy_kg=gold_in_total,
        total_sell_kg=gold_out_total,
        physical_stock=physical_stock,
        incoming_po=incoming_po,
        remaining_incoming=remaining_incoming,
        gold_in_overseas=gold_in_overseas,
        gold_in_local_platform=gold_in_local_platform,
        gold_in_local_physical=gold_in_local_physical,
        gold_in_local=gold_in_local,
        gold_in_total=gold_in_total,
        gold_out_overseas=gold_out_overseas,
        gold_out_platform=gold_out_platform,
        gold_out_physical=gold_out_physical,
        gold_out_total=gold_out_total,
        reserved=reserved,
        available=available,
        open_orders=open_orders,
    )


def calculate_revenue_points(db: Session, range_param: str = "week") -> list[RevenuePoint]:
    """
    Calculate daily revenue points aggregated over the requested time window (week or month).
    """
    today = date.today()
    if range_param == "week":
        start = today - timedelta(days=6)
    elif range_param == "month":
        start = today - timedelta(days=29)
    else:
        start = today - timedelta(days=6)
    rows = (
        db.query(
            func.date(Order.created_at).label("day"),
            func.sum(Order.premium_amount).filter(func.upper(Order.transaction_type) == "BUY").label("buy"),
            func.sum(Order.premium_amount).filter(func.upper(Order.transaction_type) == "SELL").label("sell"),
        )
        .filter(func.date(Order.created_at) >= start, Order.status != "CANCELLED")
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )
    return [RevenuePoint(day=str(r.day), buy=float(r.buy or 0), sell=float(r.sell or 0)) for r in rows]


def calculate_daily_breakdown(db: Session, target_date: str = "") -> DailyBreakdownResponse:
    """
    Calculate per-day gold in/out breakdown for a 7-day window (target_date -3 to +3).
    Groups PurchaseOrder receipts by date and po_type for gold IN,
    and Order transactions by date and channel for gold OUT.
    """
    if target_date and target_date.strip():
        try:
            anchor = datetime.strptime(target_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            anchor = date.today()
    else:
        anchor = date.today()

    window_start = anchor - timedelta(days=3)
    window_end = anchor + timedelta(days=3)
    year, month = anchor.year, anchor.month

    # --- Gold IN from PurchaseOrders (grouped by date + po_type) ---
    po_rows = (
        db.query(
            func.date(PurchaseOrder.expected_date).label("day"),
            PurchaseOrder.po_type.label("po_type"),
            func.coalesce(func.sum(PurchaseOrder.quantity), 0).label("qty"),
        )
        .filter(
            PurchaseOrder.expected_date.isnot(None),
            func.date(PurchaseOrder.expected_date) >= window_start,
            func.date(PurchaseOrder.expected_date) <= window_end,
            PurchaseOrder.status.in_(["INCOMING", "CONFIRMED", "RECEIVED", "COMPLETED"]),
        )
        .group_by(func.date(PurchaseOrder.expected_date), PurchaseOrder.po_type)
        .all()
    )
    po_by_day: dict[date, dict[str, float]] = {}
    for row in po_rows:
        d = row.day
        if d is None:
            continue
        if isinstance(d, str):
            try:
                d = datetime.strptime(d, "%Y-%m-%d").date()
            except ValueError:
                continue
        if d not in po_by_day:
            po_by_day[d] = {"OVERSEA": 0, "LOCAL": 0}
        key = row.po_type.upper() if row.po_type and row.po_type.upper() in ("OVERSEA", "LOCAL") else "LOCAL"
        po_by_day[d][key] = float(row.qty or 0)

    # --- Gold IN from Customer BUY orders (grouped by effective date) ---
    buy_orders = db.query(Order).filter(
        func.upper(Order.transaction_type) == "BUY",
        Order.status != "CANCELLED",
    ).all()
    buy_by_day: dict[date, float] = {}
    for o in buy_orders:
        d = get_effective_order_date(o)
        if d and window_start <= d <= window_end:
            buy_by_day[d] = buy_by_day.get(d, 0.0) + float(o.quantity or 0)

    # --- Gold OUT from SELL orders (grouped by effective date + region + channel) ---
    sell_orders = db.query(Order).filter(
        func.upper(Order.transaction_type) == "SELL",
        Order.status != "CANCELLED",
    ).all()
    out_by_day: dict[date, dict[str, float]] = {}
    for o in sell_orders:
        d = get_effective_order_date(o)
        if d and window_start <= d <= window_end:
            if d not in out_by_day:
                out_by_day[d] = {"overseas": 0.0, "platform": 0.0, "physical": 0.0}
            region = (getattr(o, "region", None) or "LOCAL").upper()
            ch = (getattr(o, "channel", None) or "TELEGRAM").upper()
            qty = float(o.quantity or 0)
            if region == "OVERSEAS":
                out_by_day[d]["overseas"] += qty
            elif ch in ("TELEGRAM", "WEB", "PLATFORM") or not ch:
                out_by_day[d]["platform"] += qty
            else:
                out_by_day[d]["physical"] += qty

    # --- Individual orders per day (grouped by effective date) ---
    orders_in_window = db.query(Order).order_by(Order.created_at.desc()).all()
    orders_by_day: dict[date, list] = {}
    for o in orders_in_window:
        d = get_effective_order_date(o)
        if d and window_start <= d <= window_end:
            if d not in orders_by_day:
                orders_by_day[d] = []
            orders_by_day[d].append(o)

    # --- Build daily rows ---
    days: list[DailyBreakdownRow] = []
    current = window_start
    while current <= window_end:
        d = current
        po = po_by_day.get(d, {})
        oversea = po.get("OVERSEA", 0.0)
        cust_buy = buy_by_day.get(d, 0.0)
        local_platform = po.get("LOCAL", 0.0)
        local_physical = cust_buy
        local = local_platform + local_physical
        gold_in_total = oversea + local

        out = out_by_day.get(d, {})
        overseas = out.get("overseas", 0.0)
        platform = out.get("platform", 0.0)
        physical = out.get("physical", 0.0)
        gold_out_total = overseas + platform + physical

        day_orders = orders_by_day.get(d, [])
        order_details = [
            DailyOrderDetail(
                id=o.id,
                order_no=o.order_no or "",
                transaction_type=o.transaction_type or "",
                quantity=float(o.quantity or 0),
                channel=o.channel,
                customer_name=o.customer_name,
                status=o.status or "",
                slot_date_str=o.slot_date_str,
                created_at=str(o.created_at or ""),
            )
            for o in day_orders
        ]

        days.append(
            DailyBreakdownRow(
                date=d.isoformat(),
                gold_in=DailyGoldFlow(
                    po_overseas=oversea,
                    po_local=local,
                    po_local_platform=local_platform,
                    po_local_physical=local_physical,
                    total=gold_in_total,
                ),
                gold_out=DailyGoldOut(
                    overseas=overseas,
                    platform=platform,
                    physical=physical,
                    total=gold_out_total,
                ),
                balance=gold_in_total - gold_out_total,
                transaction_count=len(day_orders),
                orders=order_details,
            )
        )
        current += timedelta(days=1)

    return DailyBreakdownResponse(year=year, month=month, days=days)

