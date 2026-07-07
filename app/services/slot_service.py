import asyncio
import logging
from app.services.google_client import slots_sheet, sell_slots_sheet

logger = logging.getLogger(__name__)


async def get_active_slots(order_type: str = "BUY"):
    sheet = sell_slots_sheet if order_type == "SELL" else slots_sheet
    rows = await asyncio.to_thread(sheet.get_all_records)

    return [
        row for row in rows
        if str(row["active"]).upper() == "YES"
    ]


async def get_slot_by_date(slot_date: str, order_type: str = "BUY"):
    sheet = sell_slots_sheet if order_type == "SELL" else slots_sheet
    rows = await asyncio.to_thread(sheet.get_all_records)

    target_date = str(slot_date).strip()

    for row in rows:
        sheet_date = str(row["slot_date"]).strip()

        if sheet_date == target_date:
            return row

    logger.warning(
        "Slot not found | target=%r | order_type=%s | available=%s",
        target_date,
        order_type,
        [str(row["slot_date"]).strip() for row in rows],
    )

    return None


async def check_stock(slot_date: str, quantity: float):
    slot = await get_slot_by_date(slot_date)

    if not slot:
        return False

    return float(slot["stock_kg"]) >= quantity


async def deduct_stock(slot_date: str, quantity: float):
    rows = await asyncio.to_thread(slots_sheet.get_all_records)

    target_date = str(slot_date).strip()

    for idx, row in enumerate(rows, start=2):
        sheet_date = str(row["slot_date"]).strip()

        if sheet_date == target_date:
            current_stock = float(row["stock_kg"])
            new_stock = current_stock - quantity

            await asyncio.to_thread(slots_sheet.update, f"C{idx}", [[new_stock]])
            return True

    return False