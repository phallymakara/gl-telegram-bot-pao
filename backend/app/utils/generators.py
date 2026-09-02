"""
Document Number & Reference Code Generator Utilities.
Generates unique, structured reference numbers for Customer Orders (ORD-S / ORD-B), Supplier Purchase Orders (PO-L / PO-O / PO-B), Stock Returns (RET), Deposits (DEP), and Withdrawals (WTH).
"""

from datetime import date
from uuid import uuid4


def generate_order_no(transaction_type: str) -> str:
    """
    Generate unique order reference number.
    BUY (customer buying gold) -> Store SELL -> ORD-S-XXXXXXXX
    SELL (customer selling gold) -> Store BUY -> ORD-B-XXXXXXXX
    """
    txn = transaction_type.upper()
    prefix = "ORD-B" if txn in ("BUY", "BUYBACK") else "ORD-S"
    return f"{prefix}-{uuid4().hex[:8].upper()}"


def generate_po_no(po_type: str) -> str:
    """
    Generate unique Purchase Order (PO) reference number based on supplier type:
    LOCAL -> PO-L-XXXXXXXX
    OVERSEA -> PO-O-XXXXXXXX
    BUYBACK -> PO-B-XXXXXXXX
    """
    ptype = po_type.upper()
    prefix = "PO-L" if ptype == "LOCAL" else ("PO-O" if ptype == "OVERSEA" else "PO-B")
    return f"{prefix}-{uuid4().hex[:8].upper()}"


def generate_return_no() -> str:
    """
    Generate unique stock return reference tracking number:
    RET-XXXXXXXX
    """
    return f"RET-{uuid4().hex[:8].upper()}"


def generate_delivery_no() -> str:
    """
    Generate unique Delivery Note reference tracking number:
    DN-YYYY-XXXXXXXX
    """
    year = date.today().year
    return f"DN-{year}-{uuid4().hex[:8].upper()}"


def generate_deposit_no() -> str:
    """
    Generate unique Deposit reference number:
    DEP-XXXXXXXX
    """
    return f"DEP-{uuid4().hex[:8].upper()}"


def generate_withdraw_no() -> str:
    """
    Generate unique Withdrawal reference number:
    WTH-XXXXXXXX
    """
    return f"WTH-{uuid4().hex[:8].upper()}"
