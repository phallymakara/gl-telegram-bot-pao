"""
Slot & Inventory Physical Stock Service.
Handles querying available slot rows, deducting physical stock on orders, crediting stock on PO receipts,
and recording inventory transaction logs.
"""

import logging
import threading
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.models.slot_row import SlotRow
from app.models.slot_table import SlotTable
from app.utils.helpers import get_cambodia_now

# Serializes every "check availability, then create/collect a SELL order" critical section across
# the whole process -- both the admin API and the Telegram bot flow run their sync order logic in
# real OS threads (FastAPI's threadpool, and asyncio.to_thread respectively), so a single process-wide
# lock here closes the race window where two concurrent requests could both pass the availability
# check before either commits, letting combined demand exceed what's actually available.
sell_order_lock = threading.Lock()

# Events that represent gold genuinely entering/leaving the vault -- used to compute the true
# physical stock total as a ledger balance, independent of any table's current sale-allocation
# number. TABLE_STOCK_MANUAL_EDIT is deliberately excluded: reallocating existing vault gold across
# price-tier tables doesn't change how much gold exists in total.
VAULT_CREDIT_TYPES = ("PO_RECEIVE", "ORDER_CANCEL_RESTOCK", "ORDER_DELETE_RESTOCK", "VAULT_ADJUSTMENT_UP")
VAULT_DEBIT_TYPES = ("ORDER_COLLECT_DEDUCT", "PO_RETURN", "VAULT_ADJUSTMENT_DOWN")


def adjust_vault_stock_sync(delta: float, reason: str) -> float:
    """
    Directly correct the vault ledger total (e.g. a physical count found a real discrepancy in how
    much gold actually exists) -- NOT the same thing as editing a table's sale-allocation STOCK box,
    which only moves gold between price tiers and never touches this total. Returns the new vault
    total after the adjustment.
    """
    session = SessionLocal()
    try:
        session.add(InventoryTransaction(
            slot_table_id=None,
            transaction_type="VAULT_ADJUSTMENT_UP" if delta >= 0 else "VAULT_ADJUSTMENT_DOWN",
            quantity=Decimal(str(abs(delta))),
            stock_before=Decimal(0),
            stock_after=Decimal(0),
            remark=reason,
        ))
        session.commit()
    finally:
        session.close()
    return compute_vault_stock_sync()


def compute_vault_stock_sync() -> float:
    """
    True physical vault total, derived from the InventoryTransaction ledger rather than summing live
    SlotTable.stock. Deliberately excludes *_INCOMING deductions too (selling straight from an
    unreceived PO's pre-sale pool nets to zero on the vault ledger, since that gold was never
    credited via PO_RECEIVE in the first place -- crediting it now and debiting it in the same
    action would be a no-op anyway).
    """
    session = SessionLocal()
    try:
        credit = session.query(func.coalesce(func.sum(InventoryTransaction.quantity), 0)).filter(
            InventoryTransaction.transaction_type.in_(VAULT_CREDIT_TYPES)
        ).scalar()
        debit = session.query(func.coalesce(func.sum(InventoryTransaction.quantity), 0)).filter(
            InventoryTransaction.transaction_type.in_(VAULT_DEBIT_TYPES)
        ).scalar()
        return max(0.0, float(credit or 0) - float(debit or 0))
    finally:
        session.close()

logger = logging.getLogger(__name__)


def _get_slot_dict(slot_row: SlotRow, slot_table: SlotTable) -> dict:
    """Map SlotRow entity to dictionary payload."""
    return {
        "slot_date": slot_row.slot_date.isoformat() if isinstance(slot_row.slot_date, (date, datetime)) else str(slot_row.slot_date),
        "premium": float(slot_row.premium),
        "qty": float(slot_row.qty) if getattr(slot_row, "qty", None) is not None else 10.0,
        "incoming_kg": float(slot_row.incoming_kg) if getattr(slot_row, "incoming_kg", None) is not None else 0.0,
        "stock_kg": float(slot_table.stock),
        "min_order": 0,
        "active": "YES" if slot_table.is_active else "NO",
    }


def _resolve_target_store_type(order_type: str) -> str:
    """
    Resolve user action perspective to store slot table type.
    User BUY -> Store SELL slot table. User SELL -> Store BUY slot table.
    """
    if not order_type:
        return "SELL"
    op = order_type.strip().upper()
    if op in ("BUY", "SELL_SLOT"):
        return "SELL"
    elif op in ("SELL", "BUY_SLOT"):
        return "BUY"
    return op


def rollover_past_slots_sync(session=None) -> int:
    """
    Automatically rolls past slot rows (< today) forward to the next available future dates.
    For each table:
      - If a row's slot_date is before today, it is moved forward to the next available
        date after the latest active slot date in that table.
      - If all rows in a table were before today, they are set to today, today+1, today+2, etc.
    This guarantees that slot schedules perpetually advance day-by-day into the future.
    """
    should_close = False
    if session is None:
        session = SessionLocal()
        should_close = True

    try:
        from datetime import date as date_type, timedelta
        today = get_cambodia_now().date()

        tables = session.query(SlotTable).all()
        updated_count = 0

        for tbl in tables:
            rows = session.query(SlotRow).filter(SlotRow.slot_table_id == tbl.id).order_by(SlotRow.slot_date).all()
            if not rows:
                continue

            past_rows = [r for r in rows if r.slot_date < today]
            if not past_rows:
                continue

            future_dates = {r.slot_date for r in rows if r.slot_date >= today}

            if future_dates:
                max_future_date = max(future_dates)
            else:
                max_future_date = today - timedelta(days=1)

            for past_row in past_rows:
                max_future_date += timedelta(days=1)
                past_row.slot_date = max_future_date
                updated_count += 1

        if updated_count > 0:
            session.commit()
            logger.info("Automatically rolled over %d expired slot rows to future dates", updated_count)

        return updated_count
    except Exception as exc:
        session.rollback()
        logger.error("Failed to rollover past slot rows: %s", exc)
        return 0
    finally:
        if should_close:
            session.close()


def get_active_slots_sync(order_type: str = "BUY") -> list[dict]:
    """
    Query active trading slots for the requested order type.
    Merges duplicate slot dates across tables, sums total incoming and general stock.
    Automatically rolls over past slot rows before returning.
    """
    session = SessionLocal()
    try:
        rollover_past_slots_sync(session)

        query = session.query(SlotTable).filter(SlotTable.is_active == True)
        store_type = _resolve_target_store_type(order_type)
        if store_type == "SELL":
            sell_tables = query.filter(SlotTable.table_name.ilike("%SELL%")).order_by(SlotTable.display_order, SlotTable.id.desc()).all()
            tables = sell_tables if sell_tables else query.order_by(SlotTable.display_order, SlotTable.id.desc()).all()
        else:
            buy_tables = query.filter(SlotTable.table_name.ilike("%BUY%")).order_by(SlotTable.display_order, SlotTable.id.desc()).all()
            tables = buy_tables if buy_tables else query.order_by(SlotTable.display_order, SlotTable.id.desc()).all()

        merged: dict[str, dict] = {}
        for t in tables:
            t_stock = float(t.stock)
            for row in t.rows:
                slot = _get_slot_dict(row, t)
                key = slot["slot_date"]
                row_incoming = float(row.incoming_kg or 0)
                table_has_stock = (t_stock > 0 or row_incoming > 0)

                if key in merged:
                    merged[key]["stock_kg"] = float(merged[key]["stock_kg"]) + t_stock
                    merged[key]["incoming_kg"] = float(merged[key]["incoming_kg"]) + row_incoming
                    # If previously assigned slot table had 0 stock, but this table has stock, switch to active starting premium
                    if not merged[key].get("_has_stock", False) and table_has_stock:
                        merged[key]["premium"] = slot["premium"]
                        merged[key]["_has_stock"] = True
                else:
                    slot["_has_stock"] = table_has_stock
                    merged[key] = slot

        # Clean internal helper flag before returning
        for s in merged.values():
            s.pop("_has_stock", None)

        today_iso = get_cambodia_now().date().isoformat()
        # Order slots starting from today (now on) into upcoming dates next
        all_slots = list(merged.values())
        upcoming = [s for s in all_slots if s["slot_date"] >= today_iso]
        upcoming.sort(key=lambda s: s["slot_date"])
        past = [s for s in all_slots if s["slot_date"] < today_iso]
        past.sort(key=lambda s: s["slot_date"])

        return upcoming + past if upcoming else all_slots
    finally:
        session.close()


def _matching_slots_sync(slot_date: str, order_type: str = "BUY") -> list[dict]:
    """Internal helper to locate active slot rows matching target date string."""
    session = SessionLocal()
    try:
        target = slot_date.strip()
        query = session.query(SlotTable).filter(SlotTable.is_active == True)
        store_type = _resolve_target_store_type(order_type)
        if store_type == "SELL":
            sell_tables = query.filter(SlotTable.table_name.ilike("%SELL%")).order_by(SlotTable.display_order, SlotTable.id.desc()).all()
            tables = sell_tables if sell_tables else query.order_by(SlotTable.display_order, SlotTable.id.desc()).all()
        else:
            buy_tables = query.filter(SlotTable.table_name.ilike("%BUY%")).order_by(SlotTable.display_order, SlotTable.id.desc()).all()
            tables = buy_tables if buy_tables else query.order_by(SlotTable.display_order, SlotTable.id.desc()).all()

        result = []
        for t in tables:
            for row in t.rows:
                row_date = row.slot_date.isoformat() if hasattr(row.slot_date, "isoformat") else str(row.slot_date)
                if row_date == target:
                    result.append(_get_slot_dict(row, t))
        return result
    finally:
        session.close()


def get_slot_by_date_sync(slot_date: str, order_type: str = "BUY") -> dict | None:
    """
    Retrieve single slot details for a specific date and order type.
    Sums total incoming and general stock across matching slot tables.
    Uses premium from first table with available stock, or first table if none have stock.
    """
    slots = _matching_slots_sync(slot_date, order_type)
    if not slots:
        return None
    active_slot = next(
        (s for s in slots if (float(s.get("stock_kg", 0)) > 0 or float(s.get("incoming_kg", 0)) > 0)),
        slots[0],
    )
    first = dict(active_slot)
    total_incoming = sum(float(s["incoming_kg"]) for s in slots)
    total_stock = sum(float(s["stock_kg"]) for s in slots)
    first["incoming_kg"] = total_incoming
    first["stock_kg"] = total_stock
    return first


def calculate_slot_tier_breakdown_sync(
    slot_date: str,
    quantity: float,
    order_type: str = "BUY",
    session=None,
) -> dict:
    """
    Calculate tiered price cascading and allocation across active slot tables in display_order.
    Handles:
    - Out of stock in first table (falls forward to next table with stock at new price).
    - Low stock in first table (splits order across tables, allocating remainder at new price).
    - Sufficient stock in first table (standard single tier allocation).
    """
    should_close = False
    if session is None:
        session = SessionLocal()
        should_close = True

    try:
        from app.utils.pricing import calculate_total_cost, calculate_unit_cost, DEFAULT_SPOT_PRICE

        target = str(slot_date).strip()
        store_type = _resolve_target_store_type(order_type)
        tables = _matching_store_tables(session, store_type)

        remaining_to_fill = float(quantity)
        total_available = 0.0
        tiers = []
        first_table_checked = False
        first_table_had_stock = False
        first_table_avail = 0.0
        first_table_premium = 0.0

        for t in tables:
            matching_row = None
            for row in t.rows:
                row_date = row.slot_date.isoformat() if hasattr(row.slot_date, "isoformat") else str(row.slot_date)
                if row_date == target:
                    matching_row = row
                    break

            if not matching_row:
                continue

            avail = float(t.stock) + float(matching_row.incoming_kg or 0)
            total_available += avail

            if not first_table_checked:
                first_table_checked = True
                first_table_had_stock = (avail > 0)
                first_table_avail = avail
                first_table_premium = float(matching_row.premium)

            if avail <= 0:
                continue

            if remaining_to_fill > 0:
                alloc = min(avail, remaining_to_fill)
                is_new_price = (len(tiers) > 0) or (not first_table_had_stock)
                tiers.append({
                    "table_id": t.id,
                    "table_name": t.table_name,
                    "available": avail,
                    "quantity": alloc,
                    "premium": float(matching_row.premium),
                    "is_new_price": is_new_price,
                })
                remaining_to_fill -= alloc

        is_sufficient = (remaining_to_fill <= 0) and (len(tiers) > 0)
        has_spillover = (len(tiers) > 1)
        is_first_table_exhausted = (not first_table_had_stock and len(tiers) > 0)
        is_new_price_involved = has_spillover or is_first_table_exhausted

        total_alloc_qty = sum(t["quantity"] for t in tiers)
        if total_alloc_qty > 0:
            total_premium_amount = sum(t["quantity"] * t["premium"] for t in tiers)
            weighted_premium = total_premium_amount / total_alloc_qty
        else:
            total_premium_amount = 0.0
            weighted_premium = first_table_premium

        # Calculate exact total USD amount using spot price
        spot_price_dec = DEFAULT_SPOT_PRICE
        total_usd_amount = 0.0
        for t in tiers:
            unit_c = calculate_unit_cost(spot_price_dec, Decimal(str(t["premium"])))
            t_cost = calculate_total_cost(Decimal(str(t["quantity"])), unit_c)
            t["cost"] = float(t_cost)
            total_usd_amount += float(t_cost)

        return {
            "is_sufficient": is_sufficient,
            "total_available": total_available,
            "requested_quantity": float(quantity),
            "allocated_quantity": total_alloc_qty,
            "has_spillover": has_spillover,
            "is_first_table_exhausted": is_first_table_exhausted,
            "is_new_price_involved": is_new_price_involved,
            "first_table_avail": first_table_avail,
            "first_table_premium": first_table_premium,
            "tiers": tiers,
            "weighted_premium": weighted_premium,
            "total_premium_amount": total_premium_amount,
            "total_amount": total_usd_amount,
        }
    finally:
        if should_close:
            session.close()


def _matching_store_tables(session, store_type: str) -> list[SlotTable]:
    """
    Resolve active SlotTable rows for an explicit store perspective (SELL = gold out, BUY = gold in),
    ordered by display_order. That ordering matters: every deduction/reservation waterfall in this
    module draws tables in this order, so admins can split a large PO into price tiers across several
    SELL tables (e.g. first 100kg at one premium, next 100kg at another) and selling will exhaust the
    first table before automatically spilling into the next one.
    """
    query = session.query(SlotTable).filter(SlotTable.is_active == True).order_by(SlotTable.display_order)
    st = (store_type or "SELL").strip().upper()
    if st == "SELL":
        tables = query.filter(SlotTable.table_name.ilike("%SELL%")).all()
        return tables if tables else query.all()
    tables = query.filter(SlotTable.table_name.ilike("%BUY%")).all()
    return tables if tables else query.filter(~SlotTable.table_name.ilike("%SELL%")).all()


def get_store_stock_total_sync(store_type: str = "SELL") -> float:
    """Sum general slot table stock (physically in the vault) across tables matching a store perspective."""
    session = SessionLocal()
    try:
        tables = _matching_store_tables(session, store_type)
        return sum(float(t.stock) for t in tables)
    finally:
        session.close()


def _to_date(value) -> date | None:
    """Normalize a SlotRow.slot_date, an order's slot_date_str, or any date-ish value to a date."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()[:10]
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def _all_active_tables(session) -> list[SlotTable]:
    """
    Every active SlotTable regardless of BUY/SELL name tagging. Incoming gold is store-perspective
    agnostic: a supplier PO's incoming_kg typically lands on a SELL-tagged table, but a Telegram
    buyback's lands on a BUY-tagged one (add_incoming_to_slot_sync credits whichever table the order
    was matched against). Once it physically arrives it's the same fungible gold either way, so
    anything checking "how much is genuinely incoming" needs to see both, not just one side.
    """
    return session.query(SlotTable).filter(SlotTable.is_active == True).order_by(SlotTable.display_order).all()


def get_incoming_up_to_date_sync(store_type: str, slot_date: str | None) -> float:
    """
    Sum day-specific incoming_kg (gold from a PO that hasn't been formally received yet, but is
    available for pre-sale) across every active table, for every PO dated on or before slot_date.
    A PO expected on day 19 has, by day 20, already effectively "arrived" even if nobody clicked
    Receive -- it just hasn't been formally logged into general stock yet. Not scoped by store_type
    (kept as a parameter for call-site compatibility) -- see _all_active_tables for why.
    """
    target = _to_date(slot_date)
    if target is None:
        return 0.0
    session = SessionLocal()
    try:
        total = 0.0
        for t in _all_active_tables(session):
            for row in t.rows:
                row_date = _to_date(row.slot_date)
                if row_date is not None and row_date <= target:
                    total += float(row.incoming_kg or 0)
        return total
    finally:
        session.close()


def deduct_store_stock_sync(
    quantity: float,
    store_type: str = "SELL",
    slot_date: str | None = None,
    txn_type: str = "ORDER_DEDUCT",
    remark: str | None = None,
    order_id: int | None = None,
) -> bool:
    """
    Deduct physical gold matching a store perspective. Draws first from tables' general STOCK, in
    display_order (price-tier cascade) -- a STOCK box is a deliberate "I'm offering exactly this much
    at this price" commitment (e.g. admin sets aside 3kg of a 7kg incoming buyback at one premium,
    saving the rest for a second table at another premium), so a matching sale should draw down that
    specific commitment rather than some coincidentally-available incoming gold from an unrelated
    source. Whatever's left falls back to incoming_kg (any PO dated on or before slot_date, oldest
    first), for however much of the order isn't covered by an explicit allocation.

    A table's STOCK box is just an allocation label, not itself a source of gold -- every kg it claims
    has to be backed by either the vault (already received) or eligible incoming (not received yet,
    but real). So each unit a table's stock gives up is backed first by vault headroom, and whatever
    that doesn't cover is backed by physically drawing down the same eligible incoming_kg rows Pass 2
    uses -- otherwise the same incoming gold could be claimed twice: once via a table's STOCK box and
    again via a separate incoming-only sale that never sees it as spoken for.

    Returns False without committing if total availability is insufficient.
    """
    session = SessionLocal()
    try:
        tables = _matching_store_tables(session, store_type)
        remaining = float(quantity)

        target = _to_date(slot_date)
        eligible_rows: list[tuple] = []
        if target is not None:
            # Incoming is scanned across every active table, not just store_type-matched ones -- a
            # buyback's incoming lands on a BUY-tagged table, but it's still real gold a SELL order
            # can draw on once its date arrives.
            for t in _all_active_tables(session):
                for row in t.rows:
                    row_date = _to_date(row.slot_date)
                    if row_date is not None and row_date <= target and float(row.incoming_kg or 0) > 0:
                        eligible_rows.append((row_date, t, row))
            eligible_rows.sort(key=lambda r: r[0])  # oldest PO date first

        def draw_incoming(amount: float, incoming_txn_type: str) -> float:
            """Physically decrement eligible incoming rows, oldest-eligible first, up to `amount`."""
            taken = 0.0
            for _, row_table, row in eligible_rows:
                if taken >= amount:
                    break
                avail = float(row.incoming_kg or 0)
                if avail <= 0:
                    continue
                take = min(avail, amount - taken)
                before = row.incoming_kg
                row.incoming_kg = Decimal(str(avail - take))
                taken += take
                session.add(InventoryTransaction(
                    slot_table_id=row_table.id,
                    order_id=order_id,
                    transaction_type=incoming_txn_type,
                    quantity=Decimal(str(take)),
                    stock_before=before,
                    stock_after=row.incoming_kg,
                    remark=remark,
                ))
            return taken

        vault_budget = compute_vault_stock_sync()

        # Pass 1: waterfall through tables' general stock first, in display_order. Each kg claimed is
        # backed by vault headroom first, then by real incoming for whatever vault can't cover.
        for t in tables:
            if remaining <= 0:
                break
            claim = min(float(t.stock), remaining)
            if claim <= 0:
                continue
            vault_part = min(claim, vault_budget)
            incoming_part = claim - vault_part
            drawn_incoming = draw_incoming(incoming_part, f"{txn_type}_INCOMING") if incoming_part > 0 else 0.0
            take = vault_part + drawn_incoming
            if take <= 0:
                continue
            vault_budget -= vault_part
            stock_before = t.stock
            t.stock = Decimal(str(float(t.stock) - take))
            remaining -= take
            session.add(InventoryTransaction(
                slot_table_id=t.id,
                order_id=order_id,
                transaction_type=txn_type,
                quantity=Decimal(str(take)),
                stock_before=stock_before,
                stock_after=t.stock,
                remark=remark,
            ))

        # Pass 2: whatever's still needed (order date not covered by any table's stock, or exceeding
        # every table's claim) falls back to the oldest remaining eligible incoming_kg.
        if remaining > 0:
            remaining -= draw_incoming(remaining, f"{txn_type}_INCOMING")

        if remaining > 1e-9:
            session.rollback()
            return False

        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def credit_store_stock_sync(
    quantity: float,
    store_type: str = "SELL",
    txn_type: str = "ORDER_RESTOCK",
    remark: str | None = None,
    order_id: int | None = None,
) -> None:
    """
    Credit physical gold back to the first slot table matching a store perspective.
    Used to reverse deduct_store_stock_sync when an order is cancelled or deleted.
    """
    session = SessionLocal()
    try:
        tables = _matching_store_tables(session, store_type)
        table = tables[0] if tables else session.query(SlotTable).first()
        if not table:
            table = SlotTable(table_name="Default 99.99% Gold Kilobar", stock=Decimal(0), is_active=True, display_order=1)
            session.add(table)
            session.flush()

        stock_before = table.stock
        table.stock = stock_before + Decimal(str(quantity))
        session.add(InventoryTransaction(
            slot_table_id=table.id,
            order_id=order_id,
            transaction_type=txn_type,
            quantity=Decimal(str(quantity)),
            stock_before=stock_before,
            stock_after=table.stock,
            remark=remark,
        ))
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def compute_sell_reservation_totals_sync() -> tuple[float, float]:
    """
    (reserved_stock, reserved_incoming): live totals of gold currently set aside for open (not yet
    collected/cancelled) SELL orders. Unlike the old FIFO simulation, this doesn't need to replay
    anything -- reserve_store_stock_sync already physically deducts a table's STOCK/incoming_kg the
    moment an order is created (see create_order), so "how much is reserved" is just the sum of that
    audit trail for orders that are still open.
    """
    session = SessionLocal()
    try:
        open_order_ids = [
            oid for (oid,) in session.query(Order.id).filter(
                Order.transaction_type == "SELL",
                Order.status.in_(("CONFIRMED", "PENDING", "PROCESSING")),
            ).all()
        ]
        if not open_order_ids:
            return 0.0, 0.0
        reserved_stock = float(session.query(func.coalesce(func.sum(InventoryTransaction.quantity), 0)).filter(
            InventoryTransaction.order_id.in_(open_order_ids),
            InventoryTransaction.transaction_type == "ORDER_RESERVE_DEDUCT",
        ).scalar() or 0)
        reserved_incoming = float(session.query(func.coalesce(func.sum(InventoryTransaction.quantity), 0)).filter(
            InventoryTransaction.order_id.in_(open_order_ids),
            InventoryTransaction.transaction_type == "ORDER_RESERVE_DEDUCT_INCOMING",
        ).scalar() or 0)
        return reserved_stock, reserved_incoming
    finally:
        session.close()


def add_stock_to_table_sync(
    slot_table_id: int | None,
    quantity: Decimal,
    txn_type: str,
    remark: str | None = None,
    order_id: int | None = None,
) -> SlotTable:
    """
    Credit physical gold stock to a target slot table and record an InventoryTransaction audit log entry.
    Used when POs are received or customer returns are processed.
    """
    session = SessionLocal()
    try:
        table = None
        if slot_table_id:
            table = session.query(SlotTable).filter(SlotTable.id == slot_table_id).first()
        if not table:
            table = session.query(SlotTable).first()
        if not table:
            table = SlotTable(table_name="Default 99.99% Gold Kilobar", stock=Decimal(100), is_active=True, display_order=1)
            session.add(table)
            session.flush()

        stock_before = table.stock
        table.stock = stock_before + Decimal(quantity)

        # Log audit trail for stock increment
        session.add(InventoryTransaction(
            slot_table_id=table.id,
            order_id=order_id,
            transaction_type=txn_type,
            quantity=Decimal(quantity),
            stock_before=stock_before,
            stock_after=table.stock,
            remark=remark,
        ))

        session.commit()
        session.refresh(table)
        return table
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def deduct_stock_from_table_sync(
    slot_table_id: int | None,
    quantity: Decimal,
    txn_type: str,
    remark: str | None = None,
    order_id: int | None = None,
) -> SlotTable:
    """
    Deduct physical gold stock from a target slot table and record an InventoryTransaction audit log entry.
    Throws ValueError if table stock is insufficient.
    """
    session = SessionLocal()
    try:
        table = None
        if slot_table_id:
            table = session.query(SlotTable).filter(SlotTable.id == slot_table_id).first()
        if not table:
            table = session.query(SlotTable).first()
        if not table:
            table = SlotTable(table_name="Default 99.99% Gold Kilobar", stock=Decimal(100), is_active=True, display_order=1)
            session.add(table)
            session.flush()

        stock_before = table.stock
        quantity = Decimal(quantity)
        if stock_before < quantity:
            raise ValueError(f"Insufficient stock on table {slot_table_id}: has {stock_before}, needs {quantity}")

        table.stock = stock_before - quantity

        # Log audit trail for stock decrement
        session.add(InventoryTransaction(
            slot_table_id=table.id,
            order_id=order_id,
            transaction_type=txn_type,
            quantity=quantity,
            stock_before=stock_before,
            stock_after=table.stock,
            remark=remark,
        ))

        session.commit()
        session.refresh(table)
        return table
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def add_incoming_to_slot_sync(
    slot_table_id: int | None,
    slot_date_str: str,
    quantity: Decimal,
    txn_type: str,
    remark: str | None = None,
) -> SlotRow:
    """
    Add day-specific incoming stock (PO or buyback) to the SlotRow matching slot_date.
    Creates a SlotRow if none exists for that date on the table.
    """
    session = SessionLocal()
    try:
        table = None
        if slot_table_id:
            table = session.query(SlotTable).filter(SlotTable.id == slot_table_id).first()
        if not table:
            table = session.query(SlotTable).first()
        if not table:
            table = SlotTable(table_name="Default 99.99% Gold Kilobar", stock=Decimal(0), is_active=True, display_order=1)
            session.add(table)
            session.flush()

        from datetime import date as date_type
        target_date = date_type.fromisoformat(slot_date_str) if isinstance(slot_date_str, str) else slot_date_str

        row = session.query(SlotRow).filter(
            SlotRow.slot_table_id == table.id,
            SlotRow.slot_date == target_date,
        ).first()

        if not row:
            row = SlotRow(slot_table_id=table.id, slot_date=target_date, premium=Decimal("0"), incoming_kg=Decimal("0"))
            session.add(row)
            session.flush()

        before = row.incoming_kg
        row.incoming_kg = before + Decimal(str(quantity))

        session.add(InventoryTransaction(
            slot_table_id=table.id,
            transaction_type=txn_type,
            quantity=Decimal(str(quantity)),
            stock_before=before,
            stock_after=row.incoming_kg,
            remark=remark,
        ))

        session.commit()
        session.refresh(row)
        return row
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def remove_incoming_from_slot_sync(
    slot_table_id: int | None,
    slot_date_str: str,
    quantity: Decimal,
    txn_type: str,
    remark: str | None = None,
) -> SlotRow:
    """
    Remove day-specific incoming stock from the SlotRow matching slot_date.
    Used when a PO is received (incoming moves to vault) or returned (incoming removed).
    """
    session = SessionLocal()
    try:
        table = None
        if slot_table_id:
            table = session.query(SlotTable).filter(SlotTable.id == slot_table_id).first()
        if not table:
            table = session.query(SlotTable).first()
        if not table:
            raise ValueError("No slot table found to remove incoming from")

        from datetime import date as date_type
        target_date = date_type.fromisoformat(slot_date_str) if isinstance(slot_date_str, str) else slot_date_str

        row = session.query(SlotRow).filter(
            SlotRow.slot_table_id == table.id,
            SlotRow.slot_date == target_date,
        ).first()

        if not row:
            raise ValueError(f"No SlotRow found for table {table.id} on {slot_date_str}")

        before = row.incoming_kg
        row.incoming_kg = max(Decimal("0"), before - Decimal(str(quantity)))

        session.add(InventoryTransaction(
            slot_table_id=table.id,
            transaction_type=txn_type,
            quantity=Decimal(str(quantity)),
            stock_before=before,
            stock_after=row.incoming_kg,
            remark=remark,
        ))

        session.commit()
        session.refresh(row)
        return row
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

