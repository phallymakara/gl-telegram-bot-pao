"""
Slot & Inventory Physical Stock Service.
Handles querying available slot rows, deducting physical stock on orders, crediting stock on PO receipts,
and recording inventory transaction logs.
"""

import logging
from datetime import date, datetime
from decimal import Decimal

from app.core.database import SessionLocal
from app.models.inventory_transaction import InventoryTransaction
from app.models.slot_row import SlotRow
from app.models.slot_table import SlotTable

logger = logging.getLogger(__name__)


def _get_slot_dict(slot_row: SlotRow, slot_table: SlotTable) -> dict:
    """Map SlotRow entity to dictionary payload."""
    return {
        "slot_date": slot_row.slot_date.isoformat() if isinstance(slot_row.slot_date, (date, datetime)) else str(slot_row.slot_date),
        "premium": float(slot_row.premium),
        "qty": float(slot_row.qty) if getattr(slot_row, "qty", None) is not None else 10.0,
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
    Merges duplicate slot dates across tables and sums total available stock.
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
    Sums total stock across matching slot tables.
    """
    slots = _matching_slots_sync(slot_date, order_type)
    if not slots:
        return None
    first = slots[0]
    total_stock = sum(float(s["stock_kg"]) for s in slots)
    first["stock_kg"] = total_stock
    return first


def check_stock_sync(slot_date: str, quantity: float, order_type: str = "BUY") -> bool:
    """
    Verify whether sufficient stock is available on the slot date to fulfill quantity.
    """
    slot = get_slot_by_date_sync(slot_date, order_type)
    if not slot:
        return False
    return float(slot["stock_kg"]) >= quantity


def deduct_stock_sync(slot_date: str, quantity: float, order_type: str = "BUY") -> bool:
    """
    Deduct physical gold quantity from matching active slot tables.
    Rolls back transaction if total stock across available tables is insufficient.
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
        found = False
        for t in tables:
            if remaining <= 0:
                break
            for row in t.rows:
                row_date = row.slot_date.isoformat() if hasattr(row.slot_date, "isoformat") else str(row.slot_date)
                if row_date != target:
                    continue
                avail = float(t.stock)
                if avail <= 0:
                    continue
                take = min(avail, remaining)
                t.stock = avail - take
                remaining -= take
                found = True
                if remaining <= 0:
                    break
        if not found or remaining > 0:
            session.rollback()
            return False
        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
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

