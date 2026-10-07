"""
Dashboard Analytics Service.
Calculates high-level admin metrics including gold inventory breakdown, channel sales, buyback volumes, and revenue trend points.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
import json
from uuid import uuid4
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.models.purchase_order import PurchaseOrder
from app.models.supplier import Supplier
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.services.slot_service import (
    compute_sell_reservation_totals_sync,
    compute_vault_stock_sync,
    credit_store_stock_sync,
)
from app.utils.generators import generate_order_no, generate_po_no
from app.utils.pricing import (
    DEFAULT_SPOT_PRICE,
    calculate_order_total,
    calculate_premium_amount,
    is_non_stock_gold,
)
from app.schemas.dashboard import (
    DashboardStats,
    RevenuePoint,
    DailyBreakdownResponse,
    DailyBreakdownRow,
    DailyGoldFlow,
    DailyGoldOut,
    DailyOrderDetail,
    StockMatrixCell,
    StockMatrixColumn,
    StockMatrixLeftTotal,
    StockMatrixData,
    StockMatrixDeductionCreate,
    SoldTrendPoint,
    SoldTrendResponse,
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

    # Physical stock is a ledger balance (PO receives minus order collections), not a live sum of
    # every table's STOCK box -- editing a table's allocation to move gold between price tiers
    # shouldn't change how much gold you actually have. See compute_vault_stock_sync for the exact
    # credit/debit event list.
    total_gold = compute_vault_stock_sync()
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
        if is_non_stock_gold(getattr(o, "product_type", None), getattr(o, "unit_type", None)):
            continue
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

    # Gold IN breakdown by source (Oversea POs, Local POs = Physical + Customer Buybacks = Platform).
    # "Physical" = a real supplier delivering physical gold to the vault (Oversea/Local POs).
    # "Platform" = gold that came in because a Telegram user sold to us through the bot (Buyback).
    po_base = db.query(func.coalesce(func.sum(PurchaseOrder.quantity), 0)).filter(
        PurchaseOrder.status.in_(["INCOMING", "CONFIRMED"]),  # Exclude RECEIVED and COMPLETED from incoming calculation
        or_(
            PurchaseOrder.product_type.is_(None),
            ~func.upper(PurchaseOrder.product_type).in_(["TL", "SL", "SV"]),
        ),
        or_(
            PurchaseOrder.unit_type.is_(None),
            func.upper(PurchaseOrder.unit_type) != "TL",
        ),
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

    gold_in_local_physical = float(po_base.filter(
        func.upper(PurchaseOrder.po_type) == "LOCAL"
    ).scalar() or 0)

    # Buyback POs now follow the same two-step flow as any other PO (created INCOMING, credited to
    # stock only once explicitly received), so they match the same INCOMING/CONFIRMED filter as
    # Overseas/Local -- no separate query needed anymore.
    gold_in_local_platform = float(po_base.filter(
        func.upper(PurchaseOrder.po_type) == "BUYBACK"
    ).scalar() or 0)

    gold_in_local = gold_in_local_platform + gold_in_local_physical
    gold_in_total = gold_in_overseas + gold_in_local
    incoming_po = gold_in_overseas + gold_in_local_physical + gold_in_local_platform
    remaining_incoming = incoming_po

    # Reserved gold: quantity already deducted from stock/incoming for open (not yet collected) SELL
    # orders -- reserve_store_stock_sync deducts for real at order-creation time now, so this is just
    # the live audit-trail total for orders that are still open, split by which pool each order drew
    # from so each half can show up against the right card (Physical Stock's "Reserved" vs Incoming's).
    reserved_stock, reserved_incoming = compute_sell_reservation_totals_sync()

    reserved = reserved_stock + reserved_incoming
    available = max(0.0, physical_stock - reserved_stock)

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
        reserved_stock=reserved_stock,
        reserved_incoming=reserved_incoming,
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
            PurchaseOrder.status.in_(["INCOMING", "CONFIRMED"]),
            or_(
                PurchaseOrder.product_type.is_(None),
                ~func.upper(PurchaseOrder.product_type).in_(["TL", "SL", "SV"]),
            ),
            or_(
                PurchaseOrder.unit_type.is_(None),
                func.upper(PurchaseOrder.unit_type) != "TL",
            ),
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
        if is_non_stock_gold(getattr(o, "product_type", None), getattr(o, "unit_type", None)):
            continue
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
        if is_non_stock_gold(getattr(o, "product_type", None), getattr(o, "unit_type", None)):
            continue
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

    # --- Individual purchase orders per day (same expected_date + status filter as po_by_day above),
    # so gold-IN totals sourced from POs (Local/Oversea/Buyback) have matching transaction line items,
    # not just customer BUY/SELL orders.
    po_details_in_window = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.expected_date.isnot(None),
            func.date(PurchaseOrder.expected_date) >= window_start,
            func.date(PurchaseOrder.expected_date) <= window_end,
            PurchaseOrder.status.in_(["INCOMING", "CONFIRMED"]),
        )
        .order_by(PurchaseOrder.created_at.desc())
        .all()
    )
    po_details_by_day: dict[date, list] = {}
    for po_row in po_details_in_window:
        d = po_row.expected_date
        if isinstance(d, datetime):
            d = d.date()
        if d is None:
            continue
        po_details_by_day.setdefault(d, []).append(po_row)

    # --- Build daily rows ---
    days: list[DailyBreakdownRow] = []
    current = window_start
    while current <= window_end:
        d = current
        po = po_by_day.get(d, {})
        oversea = po.get("OVERSEA", 0.0)
        cust_buy = buy_by_day.get(d, 0.0)
        # Local PO = Physical (a real supplier delivering physical gold to the vault).
        # Customer BUY orders = Platform (a Telegram user sold gold to us through the bot).
        local_physical = po.get("LOCAL", 0.0)
        local_platform = cust_buy
        local = local_platform + local_physical
        gold_in_total = oversea + local

        out = out_by_day.get(d, {})
        overseas = out.get("overseas", 0.0)
        platform = out.get("platform", 0.0)
        physical = out.get("physical", 0.0)
        gold_out_total = overseas + platform + physical

        day_orders = orders_by_day.get(d, [])
        day_pos = po_details_by_day.get(d, [])
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
                source="ORDER",
            )
            for o in day_orders
        ] + [
            DailyOrderDetail(
                id=po_row.id,
                order_no=po_row.po_no or "",
                transaction_type=f"PO_{(po_row.po_type or '').upper()}",
                quantity=float(po_row.quantity or 0),
                channel=po_row.po_type,
                customer_name=po_row.supplier_name,
                status=po_row.status or "",
                slot_date_str=str(po_row.expected_date) if po_row.expected_date else None,
                created_at=str(po_row.created_at or ""),
                source="PO",
            )
            for po_row in day_pos
        ]
        order_details.sort(key=lambda x: x.created_at, reverse=True)

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
                transaction_count=len(order_details),
                orders=order_details,
            )
        )
        current += timedelta(days=1)

    return DailyBreakdownResponse(year=year, month=month, days=days)


def _parse_matrix_date(d_str: str) -> date:
    """Helper to parse a date string from either ISO YYYY-MM-DD or DD/MM format."""
    d_clean = d_str.strip()
    try:
        return datetime.strptime(d_clean, "%Y-%m-%d").date()
    except ValueError:
        pass
    try:
        parsed = datetime.strptime(d_clean, "%d/%m")
        return date(date.today().year, parsed.month, parsed.day)
    except ValueError:
        return date.today()


def _normalize_and_sort_matrix_columns(columns_list: list[dict]) -> list[dict]:
    """
    Ensure stock matrix columns:
    1. Do not duplicate dates for the same brand.
    2. Are grouped by brand (Swiss -> DB -> SV -> others).
    3. Are ordered chronologically ascending by target_date (current date to next).
    """
    def _brand_priority(brand_name: str) -> tuple[int, str]:
        b = (brand_name or "").strip().lower()
        if "swiss" in b:
            return (0, b)
        elif "db" in b:
            return (1, b)
        elif "sv" in b:
            return (2, b)
        return (99, b)

    # Sort by brand priority, then chronologically by target_date ascending
    sorted_cols = sorted(
        columns_list,
        key=lambda c: (
            _brand_priority(c.get("brand", "")),
            str(c.get("target_date") or ""),
        ),
    )

    seen_pairs = set()
    deduped = []
    for col in sorted_cols:
        b_clean = (col.get("brand") or "").strip().lower()
        t_d = str(col.get("target_date") or "")
        key = (b_clean, t_d)
        if key not in seen_pairs:
            seen_pairs.add(key)
            deduped.append(col)

    return deduped


def get_matrix_columns_config(db: Session, anchor: date) -> list[dict]:
    """
    Retrieve matrix column configurations from persistent SystemSetting storage or default 5 columns.
    Ensures columns are deduplicated and ordered chronologically from current date to next.
    """
    setting = db.query(SystemSetting).filter(SystemSetting.key == "stock_matrix_columns").first()
    if setting and setting.value:
        try:
            stored = json.loads(setting.value)
            if isinstance(stored, list) and len(stored) > 0:
                raw_list = []
                for col in stored:
                    t_date_str = col.get("target_date")
                    if t_date_str:
                        try:
                            t_date = datetime.strptime(t_date_str, "%Y-%m-%d").date()
                        except ValueError:
                            t_date = _parse_matrix_date(col.get("date_label", ""))
                    else:
                        t_date = _parse_matrix_date(col.get("date_label", ""))

                    raw_list.append({
                        "id": col["id"],
                        "brand": col["brand"],
                        "date_label": col.get("date_label") or t_date.strftime("%d/%m"),
                        "header_color": col.get("header_color", "peach"),
                        "target_date": t_date.strftime("%Y-%m-%d"),
                    })

                normalized = _normalize_and_sort_matrix_columns(raw_list)

                # Persist cleaned version if any duplicates were pruned or order adjusted
                if len(normalized) != len(stored) or [c["id"] for c in normalized] != [c.get("id") for c in stored]:
                    setting.value = json.dumps(normalized)
                    db.commit()

                # Convert target_date to date object for internal callers
                result = []
                for col in normalized:
                    result.append({
                        **col,
                        "target_date": datetime.strptime(col["target_date"], "%Y-%m-%d").date(),
                    })
                return result
        except Exception:
            pass

    # Default initial 5 columns starting from anchor date
    d0 = anchor
    d1 = anchor + timedelta(days=1)
    d0_label = d0.strftime("%d/%m")
    d1_label = d1.strftime("%d/%m")
    d0_day = d0.strftime("%d")
    d1_day = d1.strftime("%d")

    return [
        {"id": f"swiss_{d0_day}", "brand": "swiss", "date_label": d0_label, "header_color": "peach", "target_date": d0},
        {"id": f"swiss_{d1_day}", "brand": "swiss", "date_label": d1_label, "header_color": "peach", "target_date": d1},
        {"id": f"db_{d0_day}", "brand": "DB", "date_label": d0_label, "header_color": "orange", "target_date": d0},
        {"id": f"db_{d1_day}", "brand": "DB", "date_label": d1_label, "header_color": "orange", "target_date": d1},
        {"id": f"sv_{d0_day}", "brand": "SV", "date_label": d0_label, "header_color": "magenta", "target_date": d0},
    ]


def calculate_stock_matrix(db: Session, target_date: str = "") -> StockMatrixData:
    """
    Calculate the brand & settlement date inventory matrix (Swiss, DB, SV) strictly from
    real database records starting from today (or target_date) and forward dates.
    Past dates ("last date") are strictly excluded.
    """
    if target_date and target_date.strip():
        try:
            anchor = datetime.strptime(target_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            anchor = date.today()
    else:
        anchor = date.today()

    columns_config = get_matrix_columns_config(db, anchor)

    all_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.status.in_(["INCOMING", "CONFIRMED", "RECEIVED", "COMPLETED"])
    ).all()

    all_orders = db.query(Order).filter(
        Order.status != "CANCELLED"
    ).all()

    def resolve_order_brand(o: Order) -> str:
        pt = getattr(o, "product_type", None)
        if pt and pt.strip():
            pt_l = pt.strip().lower()
            if "db" in pt_l:
                return "db"
            if "sv" in pt_l:
                return "sv"
            if "swiss" in pt_l:
                return "swiss"
            return pt_l

        # Gold buy and sell via platform is DB
        ch = (getattr(o, "channel", None) or "TELEGRAM").upper()
        if ch in ("TELEGRAM", "WEB", "PLATFORM"):
            return "db"
        return "swiss"

    def resolve_po_brand(po: PurchaseOrder) -> str:
        pt = getattr(po, "product_type", None)
        if pt and pt.strip():
            pt_l = pt.strip().lower()
            if "db" in pt_l:
                return "db"
            if "sv" in pt_l:
                return "sv"
            if "swiss" in pt_l:
                return "swiss"

        supp = (getattr(po, "supplier_name", None) or "").lower()
        if "db" in supp:
            return "db"
        if "sv" in supp:
            return "sv"

        # Platform customer buyback POs add to DB stock
        po_type = (getattr(po, "po_type", None) or "").upper()
        if po_type == "BUYBACK":
            return "db"

        return "swiss"

    computed_columns: list[StockMatrixColumn] = []
    col_orders: list[list[Order]] = []

    for cfg in columns_config:
        brand = cfg["brand"].lower()
        t_date = cfg["target_date"]

        # Matching POs (Gold In / Import stock)
        matching_pos = []
        for po in all_pos:
            if resolve_po_brand(po) != brand:
                continue

            po_d = po.expected_date or po.order_date
            if not po_d:
                continue

            if t_date and po_d == t_date:
                matching_pos.append(po)

        import_stock = sum(float(p.quantity or 0) for p in matching_pos)

        # Trade In orders (BUY customer buybacks)
        trade_in_orders = []
        # Matching customer SELL orders (Deductions)
        physical_orders = []
        bot_orders = []
        matching_sell_orders = []

        for o in all_orders:
            if resolve_order_brand(o) != brand:
                continue

            eff_d = get_effective_order_date(o)
            if not eff_d or eff_d != t_date:
                continue

            txn = (o.transaction_type or "").upper()
            ch = (getattr(o, "channel", None) or "").upper()

            if txn == "BUY":
                trade_in_orders.append(o)
            elif txn == "SELL":
                matching_sell_orders.append(o)
                if ch in ("TELEGRAM", "WEB", "PLATFORM"):
                    bot_orders.append(o)
                else:
                    physical_orders.append(o)

        trade_in_qty = sum(float(o.quantity or 0) for o in trade_in_orders)
        physical_qty = -sum(abs(float(o.quantity or 0)) for o in physical_orders)
        bot_qty = -sum(abs(float(o.quantity or 0)) for o in bot_orders)

        trade_in_cell = (
            StockMatrixCell(value=trade_in_qty, order_id=trade_in_orders[0].id, order_no=trade_in_orders[0].order_no)
            if trade_in_orders
            else None
        )
        physical_cell = (
            StockMatrixCell(value=physical_qty, order_id=physical_orders[0].id, order_no=physical_orders[0].order_no)
            if physical_orders
            else None
        )
        bot_cell = (
            StockMatrixCell(value=bot_qty, order_id=bot_orders[0].id, order_no=bot_orders[0].order_no)
            if bot_orders
            else None
        )

        col_orders.append(matching_sell_orders)
        deductions = [-abs(float(o.quantity or 0)) for o in matching_sell_orders]
        total_deductions = sum(deductions)
        avail = max(0.0, import_stock + trade_in_qty - abs(total_deductions))

        # Format date label to D-MMM (e.g. 6-Oct) if valid date object
        if isinstance(t_date, (date, datetime)):
            formatted_date_label = f"{t_date.day}-{t_date.strftime('%b')}"
        else:
            formatted_date_label = cfg["date_label"]

        computed_columns.append(
            StockMatrixColumn(
                id=cfg["id"],
                brand=cfg["brand"],
                date_label=formatted_date_label,
                target_date=cfg["target_date"].strftime("%Y-%m-%d"),
                header_color=cfg["header_color"],
                text_color="text-slate-900",
                import_stock=import_stock,
                trade_in=trade_in_qty,
                physical_sale=physical_qty,
                bot_sale=bot_qty,
                available_stock=avail,
                total_deductions=total_deductions,
                deductions=deductions,
                trade_in_cell=trade_in_cell,
                physical_sale_cell=physical_cell,
                bot_sale_cell=bot_cell,
            )
        )

    # Dynamic Left Totals:
    swiss_cols = [c for c in computed_columns if "swiss" in c.brand.lower()]
    db_cols = [c for c in computed_columns if "db" in c.brand.lower()]

    left_totals = []
    for sc in swiss_cols:
        d_day = sc.date_label.split("-")[0] if "-" in sc.date_label else sc.date_label.split("/")[0]
        left_totals.append(StockMatrixLeftTotal(label=f"Total {d_day}", value=sc.available_stock, category="cream"))
    if swiss_cols:
        left_totals.append(StockMatrixLeftTotal(label="Total Swiss", value=sum(sc.available_stock for sc in swiss_cols), category="cream"))

    for dc in db_cols:
        d_day = dc.date_label.split("-")[0] if "-" in dc.date_label else dc.date_label.split("/")[0]
        left_totals.append(StockMatrixLeftTotal(label=f"Total {d_day}", value=dc.available_stock, category="orange"))
    if db_cols:
        left_totals.append(StockMatrixLeftTotal(label="Total DB", value=sum(dc.available_stock for dc in db_cols), category="orange"))

    max_deduction_len = max((len(c.deductions) for c in computed_columns), default=0)
    num_rows = max(len(left_totals), max_deduction_len)
    deduction_rows: list[list[float | None]] = []
    deduction_cells: list[list[StockMatrixCell]] = []

    for r_idx in range(num_rows):
        row_vals = []
        row_cells = []
        for col_idx, col in enumerate(computed_columns):
            orders_in_col = col_orders[col_idx]
            if r_idx < len(orders_in_col):
                o = orders_in_col[r_idx]
                val = -abs(float(o.quantity or 0))
                row_vals.append(val)
                row_cells.append(StockMatrixCell(value=val, order_id=o.id, order_no=o.order_no))
            else:
                row_vals.append(None)
                row_cells.append(StockMatrixCell(value=None, order_id=None, order_no=None))
        deduction_rows.append(row_vals)
        deduction_cells.append(row_cells)

    summary_deductions = [c.total_deductions for c in computed_columns]

    return StockMatrixData(
        columns=computed_columns,
        deduction_rows=deduction_rows,
        deduction_cells=deduction_cells,
        left_totals=left_totals,
        summary_deductions=summary_deductions,
    )


def create_stock_matrix_deduction(db: Session, data: StockMatrixDeductionCreate) -> Order:
    """
    Persist a real SELL or BUY order to database representing an operational stock deduction or trade-in.
    """
    qty = abs(float(data.quantity))
    if qty <= 0:
        raise ValueError("Quantity must be greater than 0")

    brand = data.brand.strip().lower()
    txn_type = (data.transaction_type or "SELL").upper()
    order_no = generate_order_no(txn_type)
    existing = db.query(Order).filter(Order.order_no == order_no).first()
    if existing:
        order_no = f"{order_no}-{uuid4().hex[:4].upper()}"

    if data.channel:
        ch_in = data.channel.strip().upper()
        if ch_in in ("BOT", "TELEGRAM", "PLATFORM"):
            channel = "PLATFORM"
        elif ch_in in ("PHYSICAL", "STORE", "WALKIN", "WALK_IN"):
            channel = "WALK_IN"
        else:
            channel = ch_in
    else:
        channel = "PLATFORM" if brand == "db" else "WALK_IN"

    product_type = data.brand.strip().upper()

    target_d = _parse_matrix_date(data.date)
    slot_date_str = target_d.strftime("%Y-%m-%d")

    customer_name = data.customer_name or "Matrix Client"
    customer = db.query(Customer).filter(Customer.display_name == customer_name).first()
    if not customer:
        customer = Customer(username=customer_name.lower().replace(" ", "_"), display_name=customer_name)
        db.add(customer)
        db.flush()

    premium_amount = calculate_premium_amount(Decimal(str(qty)), Decimal(0))
    total_amount = calculate_order_total(Decimal(str(qty)), Decimal(str(DEFAULT_SPOT_PRICE)), Decimal(0))

    new_order = Order(
        order_no=order_no,
        customer_id=customer.id if customer else None,
        customer_name=customer_name,
        transaction_type=txn_type,
        product_type=product_type,
        quantity=Decimal(str(qty)),
        premium=Decimal(0),
        premium_amount=premium_amount,
        spot_price=Decimal(str(DEFAULT_SPOT_PRICE)),
        total_amount=total_amount,
        channel=channel,
        status="CONFIRMED",
        slot_date_str=slot_date_str,
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order


def update_stock_matrix_deduction(db: Session, order_id: int, quantity: float) -> Order:
    """
    Update the deduction amount of an existing SELL order in the real database.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError(f"Order #{order_id} not found")

    qty = abs(float(quantity))
    order.quantity = Decimal(str(qty))
    order.premium_amount = calculate_premium_amount(order.quantity, order.premium or Decimal(0))
    order.total_amount = calculate_order_total(
        order.quantity, order.spot_price or Decimal(str(DEFAULT_SPOT_PRICE)), order.premium or Decimal(0)
    )
    db.commit()
    db.refresh(order)
    return order


def delete_stock_matrix_deduction(db: Session, order_id: int) -> bool:
    """
    Delete a deduction SELL order from the real database, releasing inventory reservation if present.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError(f"Order #{order_id} not found")

    txn_type, quantity, order_no = order.transaction_type, order.quantity, order.order_no
    had_reservation = (order.status != "CANCELLED") and not is_non_stock_gold(order.product_type, order.unit_type)

    # Detach audit log entries
    db.query(InventoryTransaction).filter(InventoryTransaction.order_id == order_id).update({"order_id": None})
    db.delete(order)
    db.commit()

    if had_reservation and txn_type == "SELL" and quantity:
        credit_store_stock_sync(
            quantity=float(quantity),
            store_type="SELL",
            txn_type="ORDER_RESERVE_RELEASE",
            remark=f"Deleted stock matrix sell order {order_no}",
        )
    return True


def update_stock_matrix_import(db: Session, brand: str, date_str: str, quantity: float) -> PurchaseOrder:
    """
    Update or create real PurchaseOrder import stock for a brand & date in the database.
    """
    qty = max(0.0, float(quantity))
    brand_lower = brand.strip().lower()
    target_d = _parse_matrix_date(date_str)

    pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.status.in_(["INCOMING", "CONFIRMED", "RECEIVED", "COMPLETED"])
    ).all()

    existing_po = None
    for po in pos:
        po_d = po.expected_date or po.order_date
        if po_d != target_d:
            continue

        pt = (getattr(po, "product_type", None) or "").lower()
        supp = (getattr(po, "supplier_name", None) or "").lower()
        po_t = (getattr(po, "po_type", None) or "").upper()

        match = False
        if brand_lower in pt or brand_lower in supp:
            match = True
        elif brand_lower == "db" and po_t == "BUYBACK":
            match = True
        elif brand_lower == "swiss" and (not pt or "swiss" in pt) and po_t != "BUYBACK":
            match = True

        if match:
            existing_po = po
            break

    if existing_po:
        existing_po.quantity = Decimal(str(qty))
        if existing_po.unit_cost:
            existing_po.total_cost = (existing_po.quantity * existing_po.unit_cost).quantize(Decimal("0.01"))
        db.commit()
        db.refresh(existing_po)
        return existing_po
    else:
        po_type = "BUYBACK" if brand_lower == "db" else "LOCAL"
        po_no = generate_po_no(po_type)
        existing = db.query(PurchaseOrder).filter(PurchaseOrder.po_no == po_no).first()
        if existing:
            po_no = f"{po_no}-{uuid4().hex[:4].upper()}"

        spot_dec = Decimal(str(DEFAULT_SPOT_PRICE))
        unit_cost = (spot_dec * Decimal("32.1507")).quantize(Decimal("0.01"))
        total_cost = (Decimal(str(qty)) * unit_cost).quantize(Decimal("0.01"))

        new_po = PurchaseOrder(
            po_no=po_no,
            po_type=po_type,
            product_type=brand.strip().upper(),
            quantity=Decimal(str(qty)),
            spot_price=Decimal(str(DEFAULT_SPOT_PRICE)),
            premium=Decimal(0),
            unit_cost=unit_cost,
            total_cost=total_cost,
            status="CONFIRMED",
            order_date=target_d,
            expected_date=target_d,
            supplier_name=f"{brand.upper()} Supplier",
        )
        db.add(new_po)
        db.commit()
        db.refresh(new_po)
        return new_po


def add_matrix_column(
    db: Session,
    brand: str,
    date_str: str,
    header_color: str | None = None,
    after_id: str | None = None,
) -> StockMatrixData:
    """
    Persistently add a column to the stock matrix in SystemSetting.
    """
    current = get_matrix_columns_config(db, date.today())
    target_d = _parse_matrix_date(date_str)
    date_label = target_d.strftime("%d/%m")
    d_day = target_d.strftime("%d")

    brand_clean = brand.strip()
    brand_l = brand_clean.lower()
    if not header_color:
        if "db" in brand_l:
            header_color = "orange"
        elif "sv" in brand_l:
            header_color = "magenta"
        else:
            header_color = "peach"

    stored_list = []
    existing_brand_dates = set()
    for c in current:
        t_d = c["target_date"]
        t_d_str = t_d.strftime("%Y-%m-%d") if isinstance(t_d, (date, datetime)) else str(t_d)
        stored_list.append({
            "id": c["id"],
            "brand": c["brand"],
            "date_label": c["date_label"],
            "header_color": c["header_color"],
            "target_date": t_d_str,
        })
        if c["brand"].lower() == brand_l:
            try:
                dt_obj = datetime.strptime(t_d_str, "%Y-%m-%d").date()
                existing_brand_dates.add(dt_obj)
            except ValueError:
                pass

    # Ensure no duplicate date for this brand: advance by 1 day until an unused date is found
    while target_d in existing_brand_dates:
        target_d += timedelta(days=1)

    target_d_str = target_d.strftime("%Y-%m-%d")
    date_label = target_d.strftime("%d/%m")
    d_day = target_d.strftime("%d")

    new_id = f"{brand_l}_{d_day}_{uuid4().hex[:4]}"
    new_col = {
        "id": new_id,
        "brand": brand_clean,
        "date_label": date_label,
        "header_color": header_color,
        "target_date": target_d_str,
    }

    stored_list.append(new_col)

    # Normalize, deduplicate, and sort chronologically from current date to next
    normalized = _normalize_and_sort_matrix_columns(stored_list)

    setting = db.query(SystemSetting).filter(SystemSetting.key == "stock_matrix_columns").first()
    if not setting:
        setting = SystemSetting(key="stock_matrix_columns", value=json.dumps(normalized))
        db.add(setting)
    else:
        setting.value = json.dumps(normalized)
    db.commit()

    return calculate_stock_matrix(db)


def delete_matrix_column(db: Session, col_id: str) -> StockMatrixData:
    """
    Persistently remove a column from the stock matrix in SystemSetting.
    """
    current = get_matrix_columns_config(db, date.today())
    stored_list = []
    for c in current:
        if c["id"] == col_id:
            continue
        t_d = c["target_date"]
        t_d_str = t_d.strftime("%Y-%m-%d") if isinstance(t_d, (date, datetime)) else str(t_d)
        stored_list.append({
            "id": c["id"],
            "brand": c["brand"],
            "date_label": c["date_label"],
            "header_color": c["header_color"],
            "target_date": t_d_str,
        })

    normalized = _normalize_and_sort_matrix_columns(stored_list)

    setting = db.query(SystemSetting).filter(SystemSetting.key == "stock_matrix_columns").first()
    if not setting:
        setting = SystemSetting(key="stock_matrix_columns", value=json.dumps(normalized))
        db.add(setting)
    else:
        setting.value = json.dumps(normalized)
    db.commit()

    return calculate_stock_matrix(db)


def update_matrix_column(
    db: Session,
    col_id: str,
    brand: str | None = None,
    date_str: str | None = None,
) -> StockMatrixData:
    """
    Persistently update brand or date for a column in SystemSetting.
    Ensures columns remain sorted chronologically and deduplicated.
    """
    current = get_matrix_columns_config(db, date.today())
    stored_list = []
    for c in current:
        t_d = c["target_date"]
        t_d_str = t_d.strftime("%Y-%m-%d") if isinstance(t_d, (date, datetime)) else str(t_d)
        col_dict = {
            "id": c["id"],
            "brand": c["brand"],
            "date_label": c["date_label"],
            "header_color": c["header_color"],
            "target_date": t_d_str,
        }
        if c["id"] == col_id:
            if brand is not None:
                brand_clean = brand.strip()
                col_dict["brand"] = brand_clean
                brand_l = brand_clean.lower()
                if "db" in brand_l:
                    col_dict["header_color"] = "orange"
                elif "sv" in brand_l:
                    col_dict["header_color"] = "magenta"
                else:
                    col_dict["header_color"] = "peach"
            if date_str is not None:
                new_d = _parse_matrix_date(date_str)
                col_dict["target_date"] = new_d.strftime("%Y-%m-%d")
                col_dict["date_label"] = new_d.strftime("%d/%m")
        stored_list.append(col_dict)

    normalized = _normalize_and_sort_matrix_columns(stored_list)

    setting = db.query(SystemSetting).filter(SystemSetting.key == "stock_matrix_columns").first()
    if not setting:
        setting = SystemSetting(key="stock_matrix_columns", value=json.dumps(normalized))
        db.add(setting)
    else:
        setting.value = json.dumps(normalized)
    db.commit()

    return calculate_stock_matrix(db)


def calculate_brand_sold_trend(
    db: Session,
    range_type: str = "7d",
    start_date: str = "",
    end_date: str = "",
) -> SoldTrendResponse:
    """
    Calculate gold sold volume trends aggregated by brand (Swiss, DB, SV) over a date range.
    Supports presets: '7d', '14d', '30d', 'month', or 'custom' with explicit start/end dates.
    """
    today = date.today()

    if range_type == "custom" and start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date.strip()[:10], "%Y-%m-%d").date()
        except ValueError:
            start_dt = today - timedelta(days=6)
        try:
            end_dt = datetime.strptime(end_date.strip()[:10], "%Y-%m-%d").date()
        except ValueError:
            end_dt = today
        if start_dt > end_dt:
            start_dt, end_dt = end_dt, start_dt
    elif range_type == "14d":
        start_dt = today - timedelta(days=13)
        end_dt = today
    elif range_type == "30d":
        start_dt = today - timedelta(days=29)
        end_dt = today
    elif range_type == "month":
        start_dt = date(today.year, today.month, 1)
        end_dt = today
    else:  # default '7d'
        start_dt = today - timedelta(days=6)
        end_dt = today

    # Limit range to max 90 days to maintain performance
    if (end_dt - start_dt).days > 90:
        start_dt = end_dt - timedelta(days=90)

    # Build continuous list of days
    dates_list: list[date] = []
    curr = start_dt
    while curr <= end_dt:
        dates_list.append(curr)
        curr += timedelta(days=1)

    daily_totals: dict[date, dict[str, float]] = {
        d: {"swiss": 0.0, "db": 0.0, "sv": 0.0} for d in dates_list
    }

    # Query all active SELL orders
    sell_orders = (
        db.query(Order)
        .filter(
            Order.status != "CANCELLED",
            func.upper(Order.transaction_type) == "SELL",
        )
        .all()
    )

    def resolve_brand(o: Order) -> str:
        pt = getattr(o, "product_type", None)
        if pt and pt.strip():
            pt_l = pt.strip().lower()
            if "db" in pt_l:
                return "db"
            if "sv" in pt_l:
                return "sv"
            if "swiss" in pt_l:
                return "swiss"

        ch = (getattr(o, "channel", None) or "TELEGRAM").upper()
        if ch in ("TELEGRAM", "WEB", "PLATFORM"):
            return "db"
        return "swiss"

    for o in sell_orders:
        eff_date = get_effective_order_date(o)
        if not eff_date or eff_date < start_dt or eff_date > end_dt:
            continue
        if eff_date in daily_totals:
            b = resolve_brand(o)
            qty = abs(float(o.quantity or 0))
            if b in daily_totals[eff_date]:
                daily_totals[eff_date][b] += qty

    points: list[SoldTrendPoint] = []
    for d in dates_list:
        d_str = d.strftime("%Y-%m-%d")
        d_label = f"{d.strftime('%b')} {d.day}"
        points.append(
            SoldTrendPoint(
                date=d_str,
                date_label=d_label,
                swiss=round(daily_totals[d]["swiss"], 3),
                db=round(daily_totals[d]["db"], 3),
                sv=round(daily_totals[d]["sv"], 3),
            )
        )

    return SoldTrendResponse(
        start_date=start_dt.strftime("%Y-%m-%d"),
        end_date=end_dt.strftime("%Y-%m-%d"),
        range_type=range_type,
        points=points,
    )



