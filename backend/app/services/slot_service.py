"""
Slot & Inventory Physical Stock Service.
Handles querying available slot rows, deducting physical stock on orders, crediting stock on PO receipts,
and recording inventory transaction logs.
"""

import logging
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.models.slot_row import SlotRow
from app.models.slot_table import SlotTable

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


def get_active_slots_sync(order_type: str = "BUY") -> list[dict]:
    """
    Query active trading slots for the requested order type.
    Merges duplicate slot dates across tables, sums total incoming and general stock.
    """
    session = SessionLocal()
    try:
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
            for row in t.rows:
                slot = _get_slot_dict(row, t)
                key = slot["slot_date"]
                if key in merged:
                    merged[key]["stock_kg"] = float(merged[key]["stock_kg"]) + float(t.stock)
                    merged[key]["incoming_kg"] = float(merged[key]["incoming_kg"]) + slot["incoming_kg"]
                else:
                    merged[key] = slot
        return list(merged.values())
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
    """
    slots = _matching_slots_sync(slot_date, order_type)
    if not slots:
        return None
    first = slots[0]
    total_incoming = sum(float(s["incoming_kg"]) for s in slots)
    total_stock = sum(float(s["stock_kg"]) for s in slots)
    first["incoming_kg"] = total_incoming
    first["stock_kg"] = total_stock
    return first


def check_stock_sync(slot_date: str, quantity: float, order_type: str = "BUY") -> bool:
    """
    Verify whether sufficient stock (incoming + general) is available on the slot date.
    """
    slot = get_slot_by_date_sync(slot_date, order_type)
    if not slot:
        return False
    total_available = float(slot["incoming_kg"]) + float(slot["stock_kg"])
    return total_available >= quantity


def deduct_stock_sync(slot_date: str, quantity: float, order_type: str = "BUY") -> bool:
    """
    Deduct physical gold quantity for an order.
    Priority: day-specific incoming_kg first, then general slot table stock.
    Rolls back if total available is insufficient.
    """
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

        remaining = float(quantity)

        # Pass 1: deduct from day-specific incoming_kg on matching SlotRows
        for t in tables:
            if remaining <= 0:
                break
            for row in t.rows:
                row_date = row.slot_date.isoformat() if hasattr(row.slot_date, "isoformat") else str(row.slot_date)
                if row_date != target:
                    continue
                avail_incoming = float(row.incoming_kg)
                if avail_incoming <= 0:
                    continue
                take = min(avail_incoming, remaining)
                row.incoming_kg = Decimal(str(avail_incoming - take))
                remaining -= take
                if remaining <= 0:
                    break

        # Pass 2: deduct remaining from general slot table stock
        if remaining > 0:
            for t in tables:
                if remaining <= 0:
                    break
                avail = float(t.stock)
                if avail <= 0:
                    continue
                take = min(avail, remaining)
                t.stock = Decimal(str(avail - take))
                remaining -= take
                if remaining <= 0:
                    break

        if remaining > 0:
            session.rollback()
            return False
        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
    finally:
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


def get_incoming_up_to_date_sync(store_type: str, slot_date: str | None) -> float:
    """
    Sum day-specific incoming_kg (gold from a PO that hasn't been formally received yet, but is
    available for pre-sale) across tables matching a store perspective, for every PO dated on or
    before slot_date. A PO expected on day 19 has, by day 20, already effectively "arrived" even if
    nobody clicked Receive -- it just hasn't been formally logged into general stock yet.
    """
    target = _to_date(slot_date)
    if target is None:
        return 0.0
    session = SessionLocal()
    try:
        tables = _matching_store_tables(session, store_type)
        total = 0.0
        for t in tables:
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
    Deduct physical gold matching a store perspective. If slot_date is given, draws first from
    incoming_kg on any PO dated on or before slot_date -- oldest PO first (FIFO) -- since a PO
    expected earlier than the order's date should already be treated as arrived by then, even if
    nobody formally clicked Receive. Whatever's left waterfalls into general table stock.
    Returns False without committing if total availability is insufficient.
    """
    session = SessionLocal()
    try:
        tables = _matching_store_tables(session, store_type)
        remaining = float(quantity)

        target = _to_date(slot_date)
        eligible_rows: list[tuple] = []
        if target is not None:
            for t in tables:
                for row in t.rows:
                    row_date = _to_date(row.slot_date)
                    if row_date is not None and row_date <= target and float(row.incoming_kg or 0) > 0:
                        eligible_rows.append((row_date, t, row))
            eligible_rows.sort(key=lambda r: r[0])  # oldest PO date first

        incoming_total = sum(float(row.incoming_kg or 0) for _, _, row in eligible_rows)

        # A table's STOCK box is an admin-set allocation number, not proof anything's actually
        # arrived -- an admin could add a row for any date and claim it's sellable. The real ceiling
        # is what's genuinely in the vault (compute_vault_stock_sync, PO receives minus collections),
        # so general stock is only usable up to whichever is smaller: what the tables claim, or what
        # the vault ledger says has actually arrived. If nothing's been received yet, stock contributes
        # nothing regardless of what any table's STOCK box shows -- only eligible incoming can serve.
        stock_claimed = sum(float(t.stock) for t in tables)
        stock_usable = min(stock_claimed, compute_vault_stock_sync())

        if stock_usable + incoming_total < remaining:
            return False

        # Pass 1: draw from the oldest eligible incoming_kg first (unreceived PO stock).
        for _, t, row in eligible_rows:
            if remaining <= 0:
                break
            avail = float(row.incoming_kg or 0)
            if avail <= 0:
                continue
            take = min(avail, remaining)
            before = row.incoming_kg
            row.incoming_kg = Decimal(str(avail - take))
            remaining -= take
            session.add(InventoryTransaction(
                slot_table_id=t.id,
                order_id=order_id,
                transaction_type=f"{txn_type}_INCOMING",
                quantity=Decimal(str(take)),
                stock_before=before,
                stock_after=row.incoming_kg,
                remark=remark,
            ))

        # Pass 2: waterfall whatever's left into tables' general stock, in display_order, but never
        # draw more in total than stock_usable (the vault-backed ceiling) even if tables collectively
        # claim more than that.
        stock_budget = stock_usable
        for t in tables:
            if remaining <= 0 or stock_budget <= 0:
                break
            avail = min(float(t.stock), stock_budget)
            if avail <= 0:
                continue
            take = min(avail, remaining)
            stock_before = t.stock
            t.stock = Decimal(str(float(t.stock) - take))
            remaining -= take
            stock_budget -= take
            session.add(InventoryTransaction(
                slot_table_id=t.id,
                order_id=order_id,
                transaction_type=txn_type,
                quantity=Decimal(str(take)),
                stock_before=stock_before,
                stock_after=t.stock,
                remark=remark,
            ))

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


def compute_sell_reservation_sync(
    hypothetical_quantity: float | None = None,
    hypothetical_slot_date: str | None = None,
) -> tuple[float, float, float, float, float]:
    """
    FIFO-allocates every open SELL order (status CONFIRMED/PENDING/PROCESSING) against two shared,
    decrementing pools -- incoming PO stock and each table's general STOCK -- so orders genuinely
    compete for the same gold instead of each being checked against the full total independently:

    - Incoming: oldest PO date first, but a PO can only cover an order dated on or after that PO's
      own date (day 19's PO can serve a day 20 order, never a day 18 one).
    - Stock: tables in display_order (price-tier cascade) determine which price tier a sale is
      attributed to, but the total drawable from stock is capped at whatever's actually been
      received into the vault (compute_vault_stock_sync) -- a table's STOCK box is an admin-set
      allocation number, not proof anything's arrived, so it can never unlock more than the vault
      ledger backs. If nothing's been received yet, stock contributes nothing at all.

    Orders draw from both pools in (slot_date ascending, created_at ascending) order -- whoever's
    date comes first, or who was promised first on the same date, gets first claim.

    If hypothetical_quantity/hypothetical_slot_date are given, one extra hypothetical order is
    appended to the queue to test whether a NEW order could still be fulfilled on top of everything
    already reserved, without actually creating it.

    Returns (reserved_stock, reserved_incoming, hypothetical_incoming_used, hypothetical_stock_used,
    hypothetical_shortfall). The hypothetical figures are 0.0 when no hypothetical order was given;
    a nonzero shortfall means even the hypothetical's own demand can't be fully covered.
    """
    session = SessionLocal()
    try:
        tables = _matching_store_tables(session, "SELL")  # already in display_order

        rows: list[dict] = []
        for t in tables:
            for row in t.rows:
                d = _to_date(row.slot_date)
                amt = float(row.incoming_kg or 0)
                if d is not None and amt > 0:
                    rows.append({"date": d, "remaining": amt})
        rows.sort(key=lambda r: r["date"])

        stock_pools = [{"remaining": float(t.stock)} for t in tables]
        stock_budget = min(sum(p["remaining"] for p in stock_pools), compute_vault_stock_sync())

        open_orders = (
            session.query(Order.quantity, Order.slot_date_str, Order.created_at)
            .filter(
                Order.transaction_type == "SELL",
                Order.status.in_(("CONFIRMED", "PENDING", "PROCESSING")),
            )
            .all()
        )
        queue = [
            {"qty": float(q or 0), "date": _to_date(sd) or date.max, "created_at": ca, "is_hypothetical": False}
            for q, sd, ca in open_orders
        ]
        if hypothetical_quantity is not None:
            queue.append({
                "qty": float(hypothetical_quantity),
                "date": _to_date(hypothetical_slot_date) or date.max,
                "created_at": datetime.max.replace(tzinfo=timezone.utc),
                "is_hypothetical": True,
            })
        queue.sort(key=lambda o: (o["date"], o["created_at"]))

        reserved_stock = 0.0
        reserved_incoming = 0.0
        hyp_incoming = 0.0
        hyp_stock = 0.0
        hyp_shortfall = 0.0

        for order in queue:
            need = order["qty"]

            incoming_used = 0.0
            for row in rows:
                if need <= 0:
                    break
                if row["date"] > order["date"] or row["remaining"] <= 0:
                    continue
                take = min(row["remaining"], need)
                row["remaining"] -= take
                need -= take
                incoming_used += take
            reserved_incoming += incoming_used

            stock_used = 0.0
            for pool in stock_pools:
                if need <= 0 or stock_budget <= 0:
                    break
                take = min(pool["remaining"], need, stock_budget)
                if take <= 0:
                    continue
                pool["remaining"] -= take
                stock_budget -= take
                need -= take
                stock_used += take
            reserved_stock += stock_used

            if order["is_hypothetical"]:
                hyp_incoming = incoming_used
                hyp_stock = stock_used
                hyp_shortfall = need  # whatever's still unmet is genuinely unfulfillable right now

        return reserved_stock, reserved_incoming, hyp_incoming, hyp_stock, hyp_shortfall
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

