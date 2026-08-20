"""
Order Management & Placement Service.
Provides thread-safe async and synchronous order placement routines, customer registration, stock deduction/restocking, order cancellation, and customer return processing.
"""

import asyncio
import logging
import threading
from decimal import Decimal
from uuid import uuid4

from app.core.config import DEFAULT_GROUP_NAME, DEFAULT_SPOT_PRICE
from app.core.database import SessionLocal
from app.exceptions.order_exceptions import InsufficientStockError, SlotNotFoundError
from app.models.customer import Customer
from app.models.order import Order
from app.models.purchase_order import StockReturn
from app.models.slot_row import SlotRow
from app.models.slot_table import SlotTable
from app.models.telegram_group import TelegramGroup
from app.services.slot_service import (
    add_incoming_to_slot_sync,
    add_stock_to_table_sync,
    deduct_store_stock_sync,
    get_slot_by_date_sync,
    sell_order_lock,
)
from app.utils.generators import generate_order_no, generate_po_no
from app.utils.pricing import calculate_order_total, calculate_premium_amount, calculate_unit_cost

logger = logging.getLogger(__name__)

# Global async mutex lock ensuring atomic order placement operations during concurrent Telegram user requests
order_lock = asyncio.Lock()


def _find_or_create_customer(session, telegram_id: str, username: str) -> Customer:
    """Helper to locate an existing whitelisted customer by Telegram ID or register a new customer entry."""
    customer = session.query(Customer).filter(Customer.telegram_user_id == telegram_id).first()
    if not customer:
        customer = Customer(telegram_user_id=telegram_id, username=username, display_name=username)
        session.add(customer)
        session.flush()
    return customer


def _get_or_create_default_group(session) -> TelegramGroup:
    """Helper to fetch or initialize the default Telegram bot channel group entity."""
    group = session.query(TelegramGroup).filter(TelegramGroup.group_name == DEFAULT_GROUP_NAME).first()
    if not group:
        group = TelegramGroup(telegram_group_id="default_bot", group_name=DEFAULT_GROUP_NAME, is_active=True)
        session.add(group)
        session.flush()
    return group


def _find_slot_row(session, slot_date: str, order_type: str) -> tuple[SlotRow, SlotTable] | None:
    """Helper to locate the underlying SlotRow and parent SlotTable matching slot_date and order perspective."""
    target = slot_date.strip()
    store_type = "SELL" if order_type.upper() in ("BUY", "SELL_SLOT") else "BUY"
    query = session.query(SlotTable).filter(SlotTable.is_active == True)
    if store_type == "SELL":
        tables = query.filter(SlotTable.table_name.ilike("%SELL%")).all()
        if not tables:
            tables = query.all()
    else:
        tables = query.filter(SlotTable.table_name.ilike("%BUY%")).all()
        if not tables:
            tables = query.filter(~SlotTable.table_name.ilike("%SELL%")).all()
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
    """
    Synchronous implementation for placing customer gold orders.
    Validates slot existence, creates the customer order record, then either reserves gold for real
    (store SELL -- deducts stock/incoming immediately, same as the admin API) or credits a BUYBACK
    purchase order for later receipt (store BUY -- customer selling gold to us).
    """
    logger.info("Placing %s order: telegram_id=%s, username=%s, slot_date=%s, quantity=%.2f", order_type, telegram_id, username, slot_date, quantity)
    session = SessionLocal()
    try:
        # Section 1: Check slot details (premium lookup / existence -- not stock availability, that's
        # handled by the real reserve/deduct call in Section 5, which checks-then-mutates atomically).
        slot_info = get_slot_by_date_sync(slot_date, order_type)
        if not slot_info:
            logger.warning("Order failed: Slot not found for slot_date=%s, order_type=%s", slot_date, order_type)
            raise SlotNotFoundError("Slot not found")

        # Section 2: Locate customer profile and slot entities
        customer = _find_or_create_customer(session, telegram_id, username)
        group = _get_or_create_default_group(session)
        slot_pair = _find_slot_row(session, slot_date, order_type)
        slot_row, slot_table = slot_pair if slot_pair else (None, None)

        # Section 3: Calculate order totals
        premium_val = Decimal(str(slot_info["premium"]))
        spot_price_dec = Decimal(DEFAULT_SPOT_PRICE)
        total_amt = calculate_order_total(quantity, spot_price_dec, premium_val)

        # Store perspective: Telegram user BUY = Store SELL (Gold OUT); Telegram user SELL = Store BUY (Gold IN/Buyback)
        store_txn_type = "SELL" if order_type == "BUY" else "BUY"

        # Section 4: Create and commit the Order record -- must be committed (and thus visible to the
        # separate session deduct_store_stock_sync uses) before Section 5 can reference it by FK.
        order = Order(
            order_no=generate_order_no(store_txn_type),
            customer_id=customer.id,
            group_id=group.id,
            slot_id=slot_row.id if slot_row else None,
            quantity=Decimal(str(quantity)),
            premium=premium_val,
            premium_amount=calculate_premium_amount(quantity, premium_val),
            transaction_type=store_txn_type,
            status="CONFIRMED",
            channel="TELEGRAM",
            customer_name=customer.display_name or username,
            spot_price=spot_price_dec,
            total_amount=total_amt,
            telegram_user_id=telegram_id,
            username=username,
            slot_date_str=slot_date,
        )
        session.add(order)
        session.commit()
        session.refresh(order)

        # Section 5: Execute physical stock movement.
        if store_txn_type == "SELL":
            # Reserve gold for real, right now: stock/incoming drops immediately, same as the admin
            # API's create_order. The vault total only moves later, at collection. Held under
            # sell_order_lock so a concurrent admin API request can't interleave with this check.
            with sell_order_lock:
                reserved = deduct_store_stock_sync(
                    quantity=quantity,
                    store_type="SELL",
                    slot_date=slot_date,
                    txn_type="ORDER_RESERVE_DEDUCT",
                    remark=f"Reserved for sell order {order.order_no}",
                    order_id=order.id,
                )
            if not reserved:
                session.delete(order)
                session.commit()
                logger.warning("Order failed: Insufficient stock for slot_date=%s, requested=%.2f", slot_date, quantity)
                raise InsufficientStockError("Insufficient stock")
        elif store_txn_type == "BUY":
            from datetime import date
            from app.models.purchase_order import PurchaseOrder

            po_no = generate_po_no("BUYBACK")
            cust_name = customer.display_name or username or f"Telegram #{telegram_id}"
            unit_cost_val = calculate_unit_cost(spot_price_dec, premium_val)

            # Record customer buyback purchase order -- same two-step flow as a real supplier PO:
            # created as INCOMING here, and only credited to physical stock once an admin explicitly
            # receives it (POST /api/purchase-orders/{id}/receive), same as any other PO. It's not
            # physically in the vault just because a Telegram order was placed for it.
            po = PurchaseOrder(
                po_no=po_no,
                po_type="BUYBACK",
                supplier_id=None,
                supplier_name=cust_name,
                slot_table_id=slot_table.id if slot_table else None,
                quantity=Decimal(str(quantity)),
                spot_price=spot_price_dec,
                premium=premium_val,
                unit_cost=unit_cost_val,
                total_cost=total_amt,
                currency="USD",
                status="INCOMING",
                order_date=date.today(),
                expected_date=date.today(),
                received_date=None,
                notes=f"Telegram Customer Buyback #{order.order_no} (@{username})",
            )
            session.add(po)
            session.flush()

            # Credit as day-specific incoming (pre-arrival pool), not yet real stock.
            if slot_table:
                add_incoming_to_slot_sync(
                    slot_table_id=slot_table.id,
                    slot_date_str=date.today().isoformat(),
                    quantity=Decimal(str(quantity)),
                    txn_type="PO_INCOMING",
                    remark=f"Buyback from {cust_name} for order {order.order_no}",
                )
            session.commit()

        session.refresh(order)
        logger.info("Successfully created order_no=%s for customer=%s, total_amount=%.2f", order.order_no, customer.display_name, total_amt)
        return order
    except Exception as exc:
        session.rollback()
        logger.error("Error placing order for telegram_id=%s: %s", telegram_id, exc, exc_info=True)
        raise
    finally:
        session.close()


async def place_buy_order(
    telegram_id: str,
    username: str,
    slot_date: str,
    quantity: float,
) -> Order:
    """
    Thread-safe async wrapper for placing customer gold buy orders.
    Acquires order_lock mutex to prevent concurrent race conditions.
    """
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
    """
    Thread-safe async wrapper for placing customer gold sell (buyback) orders.
    Acquires order_lock mutex to prevent concurrent race conditions.
    """
    async with order_lock:
        return await asyncio.to_thread(
            _place_order_sync, telegram_id, username, slot_date, quantity, "SELL"
        )


def cancel_order_sync(order_id: int) -> Order:
    """
    Cancel an existing order and credit reserved gold stock back to the associated slot table.
    """
    session = SessionLocal()
    try:
        order = session.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        if order.status == "CANCELLED":
            raise ValueError(f"Order {order_id} is already cancelled")
        if order.status in ("COLLECTED", "COMPLETED"):
            raise ValueError(f"Order {order_id} is collected and cannot be cancelled")

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

    # Credit stock back to slot table on order cancellation
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
    """
    Process stock return for a customer order.
    Restocks gold onto target slot table and generates a StockReturn record.
    """
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

    # Credit stock back to inventory slot table
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
    """
    Retrieve customer order history list for a specific Telegram User ID.
    Returns latest 10 orders sorted by creation date descending.
    """
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

