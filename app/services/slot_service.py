import logging
from datetime import date, datetime

from app.core.database import SessionLocal
from app.models.slot_table import SlotTable
from app.models.slot_row import SlotRow

logger = logging.getLogger(__name__)


def _get_slot_dict(slot_row: SlotRow, slot_table: SlotTable) -> dict:
    return {
        "slot_date": slot_row.slot_date.isoformat() if isinstance(slot_row.slot_date, (date, datetime)) else str(slot_row.slot_date),
        "premium": float(slot_row.premium),
        "stock_kg": float(slot_table.stock),
        "min_order": 0,
        "active": "YES" if slot_table.is_active else "NO",
    }


def get_active_slots_sync(order_type: str = "BUY") -> list[dict]:
    session = SessionLocal()
    try:
        tables = (
            session.query(SlotTable)
            .filter(SlotTable.is_active == True)
            .order_by(SlotTable.display_order)
            .all()
        )
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
    session = SessionLocal()
    try:
        target = slot_date.strip()
        tables = (
            session.query(SlotTable)
            .filter(SlotTable.is_active == True)
            .order_by(SlotTable.display_order)
            .all()
        )
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
    slots = _matching_slots_sync(slot_date, order_type)
    if not slots:
        return None
    first = slots[0]
    total_stock = sum(float(s["stock_kg"]) for s in slots)
    first["stock_kg"] = total_stock
    return first


def check_stock_sync(slot_date: str, quantity: float) -> bool:
    slot = get_slot_by_date_sync(slot_date)
    if not slot:
        return False
    return float(slot["stock_kg"]) >= quantity


def deduct_stock_sync(slot_date: str, quantity: float) -> bool:
    session = SessionLocal()
    try:
        target = slot_date.strip()
        tables = (
            session.query(SlotTable)
            .filter(SlotTable.is_active == True)
            .order_by(SlotTable.display_order)
            .all()
        )
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
