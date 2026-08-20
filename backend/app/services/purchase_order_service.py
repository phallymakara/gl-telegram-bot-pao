"""
Supplier Purchase Order Service.
Provides business logic for creating supplier POs (crediting day-specific incoming stock),
receiving POs (moving incoming to vault), and returning POs to suppliers.
"""

import logging
from datetime import date
from decimal import Decimal

from app.core.database import SessionLocal
from app.models.purchase_order import PurchaseOrder, StockReturn
from app.services.slot_service import (
    add_incoming_to_slot_sync,
    add_stock_to_table_sync,
    deduct_stock_from_table_sync,
    remove_incoming_from_slot_sync,
)
from app.utils.generators import generate_po_no, generate_return_no

logger = logging.getLogger(__name__)


def create_purchase_order_sync(
    po_no: str,
    po_type: str,
    supplier_name: str | None,
    slot_table_id: int | None,
    quantity: Decimal,
    spot_price: Decimal,
    premium: Decimal,
    unit_cost: Decimal,
    total_cost: Decimal,
    order_date: date | None = None,
    expected_date: date | None = None,
    product_type: str | None = None,
    notes: str | None = None,
    created_by: int | None = None,
) -> PurchaseOrder:
    """
    Create a new supplier purchase order and credit day-specific incoming stock to the SlotRow.
    The incoming_kg is available for pre-sale before the PO physically arrives.
    """
    session = SessionLocal()
    try:
        po = PurchaseOrder(
            po_no=po_no,
            po_type=po_type,
            supplier_name=supplier_name,
            slot_table_id=slot_table_id,
            quantity=quantity,
            spot_price=spot_price,
            premium=premium,
            unit_cost=unit_cost,
            total_cost=total_cost,
            order_date=order_date,
            expected_date=expected_date,
            product_type=product_type,
            notes=notes,
            created_by=created_by,
            status="INCOMING",
        )
        session.add(po)
        session.commit()
        session.refresh(po)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    # Credit day-specific incoming stock to SlotRow
    if order_date and slot_table_id:
        slot_date_str = order_date.isoformat() if isinstance(order_date, date) else str(order_date)
        add_incoming_to_slot_sync(
            slot_table_id=slot_table_id,
            slot_date_str=slot_date_str,
            quantity=quantity,
            txn_type="PO_INCOMING",
            remark=f"Created {po_type} PO {po_no}",
        )
        logger.info("PO %s incoming credited: %.3f kg to slot_date=%s", po_no, float(quantity), slot_date_str)

    return po


def receive_purchase_order_sync(po_id: int) -> PurchaseOrder:
    """
    Mark a supplier purchase order as RECEIVED.
    Moves stock from day-specific incoming (SlotRow.incoming_kg) to vault stock (SlotTable.stock).
    """
    session = SessionLocal()
    try:
        po = session.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise ValueError(f"Purchase order {po_id} not found")
        if po.status not in ("DRAFT", "ORDERED", "INCOMING", "PENDING", "CONFIRMED"):
            raise ValueError(f"Purchase order {po_id} cannot be received from status {po.status}")

        po.status = "RECEIVED"
        po.received_date = date.today()
        session.commit()
        session.refresh(po)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    # Move stock from incoming to vault
    if po.order_date and po.slot_table_id:
        slot_date_str = po.order_date.isoformat() if isinstance(po.order_date, date) else str(po.order_date)
        remove_incoming_from_slot_sync(
            slot_table_id=po.slot_table_id,
            slot_date_str=slot_date_str,
            quantity=Decimal(po.quantity),
            txn_type="PO_RECEIVE_INCOMING",
            remark=f"Received {po.po_type} PO {po.po_no} - moved from incoming to vault",
        )

    # Credit physical stock to inventory slot table (vault)
    add_stock_to_table_sync(
        slot_table_id=po.slot_table_id,
        quantity=Decimal(po.quantity),
        txn_type="PO_RECEIVE",
        remark=f"Received {po.po_type} PO {po.po_no}",
    )
    return po


def return_purchase_order_sync(po_id: int, quantity: Decimal, reason: str | None) -> StockReturn:
    """
    Process stock return to supplier for a received PO.
    Deducts gold stock from vault inventory table and creates a PO_RETURN StockReturn record.
    """
    session = SessionLocal()
    try:
        po = session.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise ValueError(f"Purchase order {po_id} not found")
        if po.status != "RECEIVED":
            raise ValueError(f"Purchase order {po_id} cannot be returned from status {po.status}")

        quantity = Decimal(quantity)
        if quantity <= 0 or quantity > po.quantity:
            raise ValueError(f"Return quantity must be between 0 and {po.quantity}")

        po.status = "RETURNED"
        session.commit()
        session.refresh(po)
        slot_table_id = po.slot_table_id
        po_no = po.po_no
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    # Deduct stock from target inventory table
    deduct_stock_from_table_sync(
        slot_table_id=slot_table_id,
        quantity=quantity,
        txn_type="PO_RETURN",
        remark=f"Returned to supplier for PO {po_no}: {reason or ''}",
    )

    session = SessionLocal()
    try:
        stock_return = StockReturn(
            return_no=generate_return_no(),
            return_type="PO_RETURN",
            purchase_order_id=po_id,
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

