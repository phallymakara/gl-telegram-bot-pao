import asyncio
import logging
import threading
from decimal import Decimal
from uuid import uuid4

from app.core.database import SessionLocal
from app.models.order import Order
from app.models.customer import Customer
from app.models.telegram_group import TelegramGroup
from app.models.slot_table import SlotTable
from app.models.slot_row import SlotRow
from app.models.purchase_order import StockReturn
from app.exceptions.order_exceptions import SlotNotFoundError, InsufficientStockError
from app.services.slot_service import get_slot_by_date_sync, check_stock_sync, deduct_stock_sync, add_stock_to_table_sync
from app.config.settings import DEFAULT_GROUP_NAME

logger = logging.getLogger(__name__)

order_lock = asyncio.Lock()


def _find_or_create_customer(session, telegram_id: str, username: str) -> Customer:
    customer = session.query(Customer).filter(Customer.telegram_user_id == telegram_id).first()
    if not customer:
        customer = Customer(telegram_user_id=telegram_id, username=username, display_name=username)
        session.add(customer)
        session.flush()
    return customer


def _get_or_create_default_group(session) -> TelegramGroup:
    group = session.query(TelegramGroup).filter(TelegramGroup.group_name == DEFAULT_GROUP_NAME).first()
    if not group:
        group = TelegramGroup(telegram_group_id="default_bot", group_name=DEFAULT_GROUP_NAME, is_active=True)
        session.add(group)
        session.flush()
    return group


def _find_slot_row(session, slot_date: str, order_type: str) -> tuple[SlotRow, SlotTable] | None:
    target = slot_date.strip()
    tables = session.query(SlotTable).filter(SlotTable.is_active == True).all()
    for t in tables:
        for row in t.rows:
            row_date = row.slot_date.isoformat() if hasattr(row.slot_date, "isoformat") else str(row.slot_date)
            if row_date == target:
                return row, t
    return None


def _place_order_sync(
    telegram_id: str,
    username: str,
    slot_date: str,
    quantity: float,
    order_type: str,
) -> Order:
    session = SessionLocal()
    try:
        slot_info = get_slot_by_date_sync(slot_date, order_type)
        if not slot_info:
            raise SlotNotFoundError("Slot not found")

        if order_type == "BUY":
            if not check_stock_sync(slot_date, quantity):
                raise InsufficientStockError("Insufficient stock")

        customer = _find_or_create_customer(session, telegram_id, username)
        group = _get_or_create_default_group(session)
        slot_pair = _find_slot_row(session, slot_date, order_type)
        slot_row, slot_table = slot_pair if slot_pair else (None, None)

        premium_val = float(slot_info["premium"])
        order = Order(
            order_no=f"ORD-{uuid4().hex[:8].upper()}",
            customer_id=customer.id,
            group_id=group.id,
            slot_id=slot_row.id if slot_row else None,
            quantity=quantity,
            premium=premium_val,
            premium_amount=premium_val * quantity,
            transaction_type=order_type,
            status="CONFIRMED",
            telegram_user_id=telegram_id,
            username=username,
            slot_date_str=slot_date,
        )
        session.add(order)
        session.flush()

        if order_type == "BUY" and slot_table:
            deduct_stock_sync(slot_date, quantity)

        session.commit()
        session.refresh(order)
        return order
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


async def place_buy_order(
    telegram_id: str,
    username: str,
    slot_date: str,
    quantity: float,
) -> Order:
    async with order_lock:
        return await asyncio.to_thread(
            _place_order_sync, telegram_id, username, slot_date, quantity, "BUY"
        )


async def place_sell_order(
    telegram_id: str,
    username: str,
    slot_date: str,
    quantity: float,
) -> Order:
    async with order_lock:
        return await asyncio.to_thread(
            _place_order_sync, telegram_id, username, slot_date, quantity, "SELL"
        )


def cancel_order_sync(order_id: int) -> Order:
    session = SessionLocal()
    try:
        order = session.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        if order.status == "CANCELLED":
            raise ValueError(f"Order {order_id} is already cancelled")

        slot_table_id = order.slot.slot_table_id if order.slot else None
        if order.transaction_type == "BUY" and not slot_table_id:
            raise ValueError(f"Order {order_id} has no associated slot to restock into")

        order.status = "CANCELLED"
        session.commit()
        session.refresh(order)
        transaction_type = order.transaction_type
        quantity = order.quantity
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    if transaction_type == "BUY" and slot_table_id:
        add_stock_to_table_sync(
            slot_table_id=slot_table_id,
            quantity=Decimal(quantity),
            txn_type="ORDER_CANCEL_RESTOCK",
            remark=f"Cancelled order {order_id}",
            order_id=order_id,
        )
    return order


def return_order_sync(order_id: int, quantity: Decimal, reason: str | None) -> StockReturn:
    session = SessionLocal()
    try:
        order = session.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        if order.transaction_type != "BUY":
            raise ValueError("Only BUY orders can be returned")

        quantity = Decimal(quantity)
        if quantity <= 0 or quantity > order.quantity:
            raise ValueError(f"Return quantity must be between 0 and {order.quantity}")

        if not order.slot:
            raise ValueError(f"Order {order_id} has no associated slot to restock into")
        slot_table_id = order.slot.slot_table_id
    finally:
        session.close()

    add_stock_to_table_sync(
        slot_table_id=slot_table_id,
        quantity=quantity,
        txn_type="CUSTOMER_RETURN",
        remark=f"Customer return for order {order_id}: {reason or ''}",
        order_id=order_id,
    )

    session = SessionLocal()
    try:
        stock_return = StockReturn(
            return_no=f"RET-{uuid4().hex[:8].upper()}",
            return_type="CUSTOMER_RETURN",
            order_id=order_id,
            slot_table_id=slot_table_id,
            quantity=quantity,
            reason=reason,
        )
        session.add(stock_return)
        session.commit()
        session.refresh(stock_return)
        return stock_return
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_orders_by_telegram_id_sync(telegram_id: str) -> list[dict]:
    session = SessionLocal()
    try:
        orders = (
            session.query(Order)
            .filter(Order.telegram_user_id == telegram_id)
            .order_by(Order.created_at.desc())
            .limit(10)
            .all()
        )
        result = []
        for o in orders:
            result.append({
                "order_id": o.order_no,
                "telegram_id": o.telegram_user_id or "",
                "username": o.username or "",
                "order_type": o.transaction_type,
                "slot_date": o.slot_date_str or "",
                "premium": float(o.premium),
                "quantity_kg": float(o.quantity),
                "status": o.status,
                "created_at": o.created_at.isoformat() if o.created_at else "",
            })
        return result
    finally:
        session.close()
