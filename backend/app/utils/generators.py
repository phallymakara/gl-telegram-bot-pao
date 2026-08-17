from uuid import uuid4


def generate_order_no(transaction_type: str) -> str:
    """
    Generate unique order number.
    BUY (customer perspective) = Store SELL -> ORD-S-XXXXXXXX
    SELL (customer perspective) = Store BUY -> ORD-B-XXXXXXXX
    """
    txn = transaction_type.upper()
    prefix = "ORD-B" if txn in ("BUY", "BUYBACK") else "ORD-S"
    return f"{prefix}-{uuid4().hex[:8].upper()}"


def generate_po_no(po_type: str) -> str:
    """
    Generate unique Purchase Order (PO) number.
    po_type options: LOCAL -> PO-L, OVERSEA -> PO-O, BUYBACK -> PO-B
    """
    ptype = po_type.upper()
    prefix = "PO-L" if ptype == "LOCAL" else ("PO-O" if ptype == "OVERSEA" else "PO-B")
    return f"{prefix}-{uuid4().hex[:8].upper()}"


def generate_return_no() -> str:
    """
    Generate unique stock return tracking number.
    """
    return f"RET-{uuid4().hex[:8].upper()}"
