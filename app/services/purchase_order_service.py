import logging
from datetime import date
from decimal import Decimal
from uuid import uuid4

from app.core.database import SessionLocal
from app.models.purchase_order import PurchaseOrder, StockReturn
from app.services.slot_service import add_stock_to_table_sync, deduct_stock_from_table_sync

logger = logging.getLogger(__name__)


def generate_po_no(po_type: str) -> str:
    prefix = "PO-L" if po_type == "LOCAL" else "PO-O"
    return f"{prefix}-{uuid4().hex[:8].upper()}"


def generate_return_no() -> str:
    return f"RET-{uuid4().hex[:8].upper()}"


def receive_purchase_order_sync(po_id: int) -> PurchaseOrder:
    session = SessionLocal()
    try:
        po = session.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise ValueError(f"Purchase order {po_id} not found")
        if po.status not in ("DRAFT", "ORDERED"):
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

    add_stock_to_table_sync(
        slot_table_id=po.slot_table_id,
        quantity=Decimal(po.quantity),
        txn_type="PO_RECEIVE",
        remark=f"Received {po.po_type} PO {po.po_no}",
    )
    return po


def return_purchase_order_sync(po_id: int, quantity: Decimal, reason: str | None) -> StockReturn:
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
