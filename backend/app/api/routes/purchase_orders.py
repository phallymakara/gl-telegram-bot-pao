from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_db
from app.api.schemas import PurchaseOrderCreate, PurchaseOrderResponse, POReturnRequest, StockReturnResponse
from app.models.purchase_order import PurchaseOrder
from app.models.slot_table import SlotTable
from app.services.purchase_order_service import generate_po_no, receive_purchase_order_sync, return_purchase_order_sync

router = APIRouter()


from app.api.schemas import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse, POReturnRequest, StockReturnResponse


def _to_response(po: PurchaseOrder) -> PurchaseOrderResponse:
    supplier_name = po.supplier_name
    if not supplier_name and po.supplier:
        supplier_name = po.supplier.name

    return PurchaseOrderResponse(
        id=po.id,
        po_no=po.po_no,
        po_type=po.po_type,
        supplier_id=po.supplier_id,
        supplier_name=supplier_name,
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


@router.get("/", response_model=list[PurchaseOrderResponse])
def list_purchase_orders(
    po_type: str = "",
    status_filter: str = "",
    search: str = "",
    received_date: str = "",
    db: Session = Depends(get_db),
):
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
    po_type = body.po_type.upper()
    if po_type not in ("LOCAL", "OVERSEA", "BUYBACK"):
        raise HTTPException(status_code=400, detail="po_type must be LOCAL, OVERSEA, or BUYBACK")

    slot_table_id = body.slot_table_id
    if not slot_table_id:
        table = db.query(SlotTable).first()
        slot_table_id = table.id if table else None

    unit_cost = body.unit_cost
    spot_price = body.spot_price or Decimal("4376.2")
    premium = body.premium or Decimal("200")
    if unit_cost is None or unit_cost == Decimal(0):
        unit_cost = (spot_price * Decimal("32.148")) + premium

    total_cost = body.quantity * unit_cost

    po = PurchaseOrder(
        po_no=generate_po_no(po_type),
        po_type=po_type,
        supplier_id=body.supplier_id,
        supplier_name=body.supplier_name,
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
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if body.po_type:
        po.po_type = body.po_type.upper()
    if body.supplier_name is not None:
        po.supplier_name = body.supplier_name
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

    spot = po.spot_price or Decimal("4376.2")
    prem = po.premium or Decimal("200")
    po.unit_cost = (spot * Decimal("32.148")) + prem
    po.total_cost = po.quantity * po.unit_cost

    db.commit()
    db.refresh(po)
    return _to_response(po)


@router.delete("/{po_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    db.delete(po)
    db.commit()
    return None


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.slot_table),
    ).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return _to_response(po)


@router.post("/{po_id}/mark-ordered", response_model=PurchaseOrderResponse)
def mark_ordered(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    po.status = "INCOMING"
    db.commit()
    db.refresh(po)
    return _to_response(po)


@router.post("/{po_id}/confirm", response_model=PurchaseOrderResponse)
def confirm_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    po.status = "CONFIRMED"
    db.commit()
    db.refresh(po)
    return _to_response(po)


@router.post("/{po_id}/receive", response_model=PurchaseOrderResponse)
def receive_purchase_order(po_id: int, db: Session = Depends(get_db)):
    try:
        po = receive_purchase_order_sync(po_id)
    except ValueError as e:
        # Fallback to force status to RECEIVED if needed
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise HTTPException(status_code=404, detail="Purchase order not found")
        po.status = "RECEIVED"
        db.commit()
        db.refresh(po)
    db.expire_all()
    return get_purchase_order(po.id, db)


@router.post("/{po_id}/return", response_model=StockReturnResponse)
def return_purchase_order(po_id: int, body: POReturnRequest, db: Session = Depends(get_db)):
    try:
        stock_return = return_purchase_order_sync(po_id, body.quantity, body.reason)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return stock_return


@router.post("/{po_id}/cancel", response_model=PurchaseOrderResponse)
def cancel_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    po.status = "CANCELLED"
    db.commit()
    db.refresh(po)
    return _to_response(po)
