"""
Purchase Orders API routes.
Provides endpoints for creating, querying, updating, confirming, receiving, returning, and cancelling supplier purchase orders (LOCAL, OVERSEA, BUYBACK).
"""

from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_db
from app.api.schemas import (
    CalculatePricingRequest,
    CalculatePricingResponse,
    POReturnRequest,
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    PurchaseOrderUpdate,
    StockReturnResponse,
)
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder
from app.models.slot_table import SlotTable
from app.services.purchase_order_service import receive_purchase_order_sync, return_purchase_order_sync
from app.utils.generators import generate_po_no
from app.utils.pricing import DEFAULT_PREMIUM, DEFAULT_SPOT_PRICE, TROY_OUNCES_PER_KG, calculate_total_cost, calculate_unit_cost

router = APIRouter()


def _to_response(po: PurchaseOrder) -> PurchaseOrderResponse:
    """Helper mapper converting PurchaseOrder model entity to PurchaseOrderResponse DTO schema."""
    supplier_name = po.supplier_name
    if not supplier_name and po.supplier:
        supplier_name = po.supplier.name

    return PurchaseOrderResponse(
        id=po.id,
        po_no=po.po_no,
        po_type=po.po_type,
        supplier_id=po.supplier_id,
        supplier_name=supplier_name,
        product_type=po.product_type,
        unit_type=getattr(po, "unit_type", "Kg") or "Kg",
        slot_table_id=po.slot_table_id,
        slot_table_name=po.slot_table.table_name if po.slot_table else None,
        quantity=po.quantity,
        spot_price=po.spot_price,
        premium=po.premium,
        unit_cost=po.unit_cost,
        total_cost=po.total_cost,
        currency=po.currency,
        status=po.status,
        order_date=po.order_date,
        expected_date=po.expected_date,
        received_date=po.received_date,
        notes=po.notes,
        shipping_method=po.shipping_method,
        tracking_no=po.tracking_no,
        customs_fee=po.customs_fee,
        port_of_origin=po.port_of_origin,
        created_at=po.created_at,
    )


@router.post("/calculate", response_model=CalculatePricingResponse)
def calculate_pricing(body: CalculatePricingRequest, db: Session = Depends(get_db)):
    """
    Calculate conversion factor, unit cost, and solve any 4th missing variable (spot_price, premium, quantity, total_cost).
    Formula (KG): Total Cost = Quantity * ((Spot Price * Conversion Factor) + Premium)
    Formula (TL): Total Cost = Quantity * (((Spot Price * Conversion Factor) + Premium) / 26.7)
    """
    factor = TROY_OUNCES_PER_KG
    if body.product_type:
        prod = db.query(Product).filter(Product.name == body.product_type, Product.is_active == True).first()
        if prod and prod.conversion_factor:
            factor = Decimal(str(prod.conversion_factor))

    is_tl = body.unit_type is not None and str(body.unit_type).strip().upper() == "TL"
    tl_divisor = Decimal("26.7")

    s_val = body.spot_price
    p_val = body.premium
    q_val = body.quantity
    t_val = body.total_cost

    has_s = s_val is not None and s_val > Decimal(0)
    has_p = p_val is not None
    has_q = q_val is not None and q_val > Decimal(0)
    has_t = t_val is not None and t_val > Decimal(0)

    count = sum([1 for x in [has_s, has_p, has_q, has_t] if x])
    solved_field = None

    def calc_unit_cost(s: Decimal, p: Decimal) -> Decimal:
        raw_kg_cost = (s * factor) + p
        if is_tl:
            return raw_kg_cost / tl_divisor
        return raw_kg_cost

    if count == 3:
        if not has_t and has_s and has_p and has_q and q_val > Decimal(0):
            unit_cost = calc_unit_cost(s_val, p_val)
            t_val = (q_val * unit_cost).quantize(Decimal("0.01"))
            solved_field = "total_cost"
        elif not has_q and has_s and has_p and has_t:
            unit_cost = calc_unit_cost(s_val, p_val)
            if unit_cost > Decimal(0):
                q_val = (t_val / unit_cost).quantize(Decimal("0.001"))
                solved_field = "quantity"
        elif not has_p and has_s and has_q and has_t and q_val > Decimal(0):
            unit_cost = t_val / q_val
            raw_kg_cost = (unit_cost * tl_divisor) if is_tl else unit_cost
            spot_kg = s_val * factor
            p_val = (raw_kg_cost - spot_kg).quantize(Decimal("0.01"))
            solved_field = "premium"
        elif not has_s and has_p and has_q and has_t and q_val > Decimal(0) and factor > Decimal(0):
            unit_cost = t_val / q_val
            raw_kg_cost = (unit_cost * tl_divisor) if is_tl else unit_cost
            spot_kg = raw_kg_cost - p_val
            s_val = (spot_kg / factor).quantize(Decimal("0.01"))
            solved_field = "spot_price"

    elif count == 4:
        last = body.last_edited_field
        if last in ("spot_price", "premium", "quantity", "product_type", "unit_type"):
            unit_cost = calc_unit_cost(s_val, p_val)
            t_val = (q_val * unit_cost).quantize(Decimal("0.01"))
            solved_field = "total_cost"
        elif last in ("total_cost", "price"):
            unit_cost = calc_unit_cost(s_val, p_val)
            if unit_cost > Decimal(0):
                q_val = (t_val / unit_cost).quantize(Decimal("0.001"))
                solved_field = "quantity"

    final_unit_cost = Decimal(0)
    if s_val is not None:
        final_unit_cost = calc_unit_cost(s_val, p_val or Decimal(0))

    return CalculatePricingResponse(
        conversion_factor=factor,
        unit_cost=final_unit_cost,
        spot_price=s_val,
        premium=p_val,
        quantity=q_val,
        total_cost=t_val,
        solved_field=solved_field,
    )


@router.get("/", response_model=list[PurchaseOrderResponse])
def list_purchase_orders(
    po_type: str = "",
    status_filter: str = "",
    search: str = "",
    received_date: str = "",
    db: Session = Depends(get_db),
):
    """
    Retrieve list of purchase orders with eager-loaded supplier and slot table relations.
    Supports filtering by po_type (LOCAL, OVERSEA, BUYBACK), status_filter, search (po_no), and received_date.
    Limits output to latest 200 records.
    """
    q = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.slot_table),
    )
    if po_type and po_type.upper() != "ALL":
        q = q.filter(PurchaseOrder.po_type == po_type.upper())
    if status_filter and status_filter.upper() != "ALL":
        q = q.filter(PurchaseOrder.status == status_filter.upper())
    if search:
        q = q.filter(PurchaseOrder.po_no.ilike(f"%{search}%"))
    if received_date:
        from datetime import date as dt_date
        try:
            target_date = dt_date.fromisoformat(received_date.strip())
            q = q.filter(func.date(PurchaseOrder.received_date) == target_date)
        except ValueError:
            pass
    q = q.order_by(PurchaseOrder.created_at.desc()).limit(200)
    return [_to_response(po) for po in q.all()]


@router.post("/", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(body: PurchaseOrderCreate, db: Session = Depends(get_db)):
    """
    Create a new supplier purchase order (LOCAL, OVERSEA, or BUYBACK).
    Generates unique PO number (PO-L, PO-O, PO-B) and calculates unit cost and total cost.
    """
    po_type = body.po_type.upper()
    if po_type not in ("LOCAL", "OVERSEA", "BUYBACK"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="po_type must be LOCAL, OVERSEA, or BUYBACK",
        )

    # Assign default slot table if not specified
    slot_table_id = body.slot_table_id
    if not slot_table_id:
        table = db.query(SlotTable).first()
        slot_table_id = table.id if table else None

    # Calculate unit cost and total cost via standard pricing helpers
    factor = TROY_OUNCES_PER_KG
    if body.product_type:
        prod = db.query(Product).filter(Product.name == body.product_type).first()
        if prod and prod.conversion_factor:
            factor = Decimal(str(prod.conversion_factor))

    unit_cost = body.unit_cost
    spot_price = body.spot_price or DEFAULT_SPOT_PRICE
    premium = body.premium or DEFAULT_PREMIUM
    if unit_cost is None or unit_cost == Decimal(0):
        unit_cost = calculate_unit_cost(spot_price, premium, conversion_factor=factor)

    total_cost = calculate_total_cost(body.quantity, unit_cost)

    po = PurchaseOrder(
        po_no=body.po_no or generate_po_no(po_type),
        po_type=po_type,
        supplier_id=body.supplier_id,
        supplier_name=body.supplier_name,
        product_type=body.product_type,
        unit_type=body.unit_type or "Kg",
        slot_table_id=slot_table_id,
        quantity=body.quantity,
        spot_price=spot_price,
        premium=premium,
        unit_cost=unit_cost,
        total_cost=total_cost,
        currency=body.currency,
        status="INCOMING",
        order_date=body.order_date,
        expected_date=body.received_date or body.expected_date or body.order_date,
        received_date=None,
        notes=body.notes,
        shipping_method=body.shipping_method if po_type == "OVERSEA" else None,
        tracking_no=body.tracking_no if po_type == "OVERSEA" else None,
        customs_fee=body.customs_fee if po_type == "OVERSEA" else None,
        port_of_origin=body.port_of_origin if po_type == "OVERSEA" else None,
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return _to_response(po)


@router.put("/{po_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(po_id: int, body: PurchaseOrderUpdate, db: Session = Depends(get_db)):
    """
    Update details of an existing purchase order by ID and recalculate total costs.
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")

    if body.po_type:
        po.po_type = body.po_type.upper()
    if body.supplier_name is not None:
        po.supplier_name = body.supplier_name
    if body.product_type is not None:
        po.product_type = body.product_type
    if body.unit_type is not None:
        po.unit_type = body.unit_type
    if body.quantity is not None:
        po.quantity = body.quantity
    if body.spot_price is not None:
        po.spot_price = body.spot_price
    if body.premium is not None:
        po.premium = body.premium
    if body.notes is not None:
        po.notes = body.notes
    if body.status is not None:
        po.status = body.status.upper()
    if body.order_date is not None:
        po.order_date = body.order_date
    if body.received_date is not None:
        po.received_date = body.received_date

    factor = TROY_OUNCES_PER_KG
    if po.product_type:
        prod = db.query(Product).filter(Product.name == po.product_type).first()
        if prod and prod.conversion_factor:
            factor = Decimal(str(prod.conversion_factor))

    spot = po.spot_price or DEFAULT_SPOT_PRICE
    prem = po.premium or DEFAULT_PREMIUM
    po.unit_cost = calculate_unit_cost(spot, prem, conversion_factor=factor)
    po.total_cost = calculate_total_cost(po.quantity, po.unit_cost)

    db.commit()
    db.refresh(po)
    return _to_response(po)


@router.delete("/{po_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase_order(po_id: int, db: Session = Depends(get_db)):
    """
    Delete a purchase order by ID.
    Returns HTTP 204 No Content upon deletion.
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    db.delete(po)
    db.commit()
    return None


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(po_id: int, db: Session = Depends(get_db)):
    """
    Retrieve single purchase order detail by ID.
    Raises HTTP 404 if the purchase order does not exist.
    """
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.slot_table),
    ).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    return _to_response(po)


@router.post("/{po_id}/mark-ordered", response_model=PurchaseOrderResponse)
def mark_ordered(po_id: int, db: Session = Depends(get_db)):
    """
    Mark a purchase order status as INCOMING.
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    po.status = "INCOMING"
    db.commit()
    db.refresh(po)
    return _to_response(po)


@router.post("/{po_id}/confirm", response_model=PurchaseOrderResponse)
def confirm_purchase_order(po_id: int, db: Session = Depends(get_db)):
    """
    Confirm a purchase order status as CONFIRMED.
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    po.status = "CONFIRMED"
    db.commit()
    db.refresh(po)
    return _to_response(po)


@router.post("/{po_id}/receive", response_model=PurchaseOrderResponse)
def receive_purchase_order(po_id: int, db: Session = Depends(get_db)):
    """
    Receive a purchase order and credit physical stock into the associated inventory slot table.
    Delegates inventory update to purchase_order_service.
    """
    try:
        po = receive_purchase_order_sync(po_id)
    except ValueError as e:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
        po.status = "RECEIVED"
        db.commit()
        db.refresh(po)
    db.expire_all()
    return get_purchase_order(po.id, db)


@router.post("/{po_id}/return", response_model=StockReturnResponse)
def return_purchase_order(po_id: int, body: POReturnRequest, db: Session = Depends(get_db)):
    """
    Process stock return to supplier for a received PO.
    Delegates stock deduction and return record generation to purchase_order_service.
    """
    try:
        stock_return = return_purchase_order_sync(po_id, body.quantity, body.reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return stock_return


@router.post("/{po_id}/cancel", response_model=PurchaseOrderResponse)
def cancel_purchase_order(po_id: int, db: Session = Depends(get_db)):
    """
    Cancel an incoming or pending purchase order.
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    po.status = "CANCELLED"
    db.commit()
    db.refresh(po)
    return _to_response(po)

