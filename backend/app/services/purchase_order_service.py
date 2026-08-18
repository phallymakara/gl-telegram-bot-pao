"""
Supplier Purchase Order Service.
Provides business logic for receiving supplier gold purchase orders (crediting physical inventory stock)
and returning POs back to suppliers (deducting physical stock).
"""

import logging
from datetime import date
from decimal import Decimal

from app.core.database import SessionLocal
from app.models.purchase_order import PurchaseOrder, StockReturn
from app.services.slot_service import add_stock_to_table_sync, deduct_stock_from_table_sync
from app.utils.generators import generate_po_no, generate_return_no

logger = logging.getLogger(__name__)


def receive_purchase_order_sync(po_id: int) -> PurchaseOrder:
    """
    Mark a supplier purchase order as RECEIVED and credit physical gold quantity to the target slot table.
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

    # Credit physical stock to inventory slot table
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
    Deducts gold stock from inventory table and creates a PO_RETURN StockReturn record.
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

