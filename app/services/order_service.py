import asyncio
import logging
from uuid import uuid4

from app.models.order import Order
from app.services.order_sheet_service import create_order
from app.exceptions.order_exceptions import (
    SlotNotFoundError,
    InsufficientStockError
)

from app.services.slot_service import (
    get_slot_by_date,
    check_stock,
    deduct_stock,
)

logger = logging.getLogger(__name__)

# Global lock to serialize stock checking, order creation, and stock deduction
order_lock = asyncio.Lock()


async def place_buy_order(
    telegram_id: str,
    username: str,
    slot_date: str,
    quantity: float,
):
    async with order_lock:
        slot = await get_slot_by_date(slot_date)

        if not slot:
            logger.warning("BUY failed: slot not found | slot=%s", slot_date)
            raise SlotNotFoundError("Slot not found")

        if not await check_stock(slot_date, quantity):
            logger.warning(
                "BUY failed: insufficient stock | slot=%s | quantity=%s",
                slot_date,
                quantity,
            )
            raise InsufficientStockError("Insufficient stock")

        order = Order(
            order_id=f"ORD-{uuid4().hex[:8].upper()}",
            telegram_id=telegram_id,
            username=username,
            order_type="BUY",
            slot_date=slot_date,
            premium=slot["premium"],
            quantity_kg=quantity,
            status="CONFIRMED",
        )

        await create_order(order)
        await deduct_stock(slot_date, quantity)

    logger.info(
        "BUY order created | order_id=%s | user=%s | slot=%s | quantity=%s",
        order.order_id,
        order.username,
        order.slot_date,
        order.quantity_kg,
    )

    return order


async def place_sell_order(
    telegram_id: str,
    username: str,
    slot_date: str,
    quantity: float,
):
    async with order_lock:
        slot = await get_slot_by_date(slot_date, "SELL")

        if not slot:
            logger.warning("SELL failed: slot not found | slot=%s", slot_date)
            raise SlotNotFoundError("Slot not found")

        order = Order(
            order_id=f"ORD-{uuid4().hex[:8].upper()}",
            telegram_id=telegram_id,
            username=username,
            order_type="SELL",
            slot_date=slot_date,
            premium=slot["premium"],
            quantity_kg=quantity,
            status="CONFIRMED",
        )

        await create_order(order)

    logger.info(
        "SELL order created | order_id=%s | user=%s | slot=%s | quantity=%s",
        order.order_id,
        order.username,
        order.slot_date,
        order.quantity_kg,
    )

    return order