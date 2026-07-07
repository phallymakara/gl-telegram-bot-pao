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
        tables = session.query(SlotTable).filter(SlotTable.is_active == True).all()
        result = []
        for t in tables:
            for row in t.rows:
                result.append(_get_slot_dict(row, t))
        return result
    finally:
        session.close()


def get_slot_by_date_sync(slot_date: str, order_type: str = "BUY") -> dict | None:
    session = SessionLocal()
    try:
        target = slot_date.strip()
        tables = session.query(SlotTable).filter(SlotTable.is_active == True).all()
        for t in tables:
            for row in t.rows:
                row_date = row.slot_date.isoformat() if hasattr(row.slot_date, "isoformat") else str(row.slot_date)
                if row_date == target:
                    return _get_slot_dict(row, t)
        return None
    finally:
        session.close()


def check_stock_sync(slot_date: str, quantity: float) -> bool:
    slot = get_slot_by_date_sync(slot_date)
    if not slot:
        return False
    return float(slot["stock_kg"]) >= quantity


def deduct_stock_sync(slot_date: str, quantity: float) -> bool:
    session = SessionLocal()
    try:
        target = slot_date.strip()
        tables = session.query(SlotTable).filter(SlotTable.is_active == True).all()
        for t in tables:
            for row in t.rows:
                row_date = row.slot_date.isoformat() if hasattr(row.slot_date, "isoformat") else str(row.slot_date)
                if row_date == target:
                    t.stock = float(t.stock) - quantity
                    session.commit()
                    return True
        return False
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
