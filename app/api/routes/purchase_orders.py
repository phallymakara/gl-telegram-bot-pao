from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_db
from app.api.schemas import PurchaseOrderCreate, PurchaseOrderResponse, POReturnRequest, StockReturnResponse
from app.models.purchase_order import PurchaseOrder
from app.models.slot_table import SlotTable
from app.services.purchase_order_service import generate_po_no, receive_purchase_order_sync, return_purchase_order_sync

router = APIRouter()


def _to_response(po: PurchaseOrder) -> PurchaseOrderResponse:
    return PurchaseOrderResponse(
        id=po.id,
        po_no=po.po_no,
        po_type=po.po_type,
        supplier_id=po.supplier_id,
        supplier_name=po.supplier.name if po.supplier else None,
        slot_table_id=po.slot_table_id,
        slot_table_name=po.slot_table.table_name if po.slot_table else None,
        quantity=po.quantity,
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
    db: Session = Depends(get_db),
):
    q = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.slot_table),
    )
    if po_type:
        q = q.filter(PurchaseOrder.po_type == po_type.upper())
    if status_filter:
        q = q.filter(PurchaseOrder.status == status_filter.upper())
    if search:
        q = q.filter(PurchaseOrder.po_no.ilike(f"%{search}%"))
    q = q.order_by(PurchaseOrder.created_at.desc()).limit(200)
    return [_to_response(po) for po in q.all()]


@router.post("/", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(body: PurchaseOrderCreate, db: Session = Depends(get_db)):
    po_type = body.po_type.upper()
    if po_type not in ("LOCAL", "OVERSEA"):
        raise HTTPException(status_code=400, detail="po_type must be LOCAL or OVERSEA")

    table = db.query(SlotTable).filter(SlotTable.id == body.slot_table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Slot table not found")

    po = PurchaseOrder(
        po_no=generate_po_no(po_type),
        po_type=po_type,
        supplier_id=body.supplier_id,
        slot_table_id=body.slot_table_id,
        quantity=body.quantity,
        unit_cost=body.unit_cost,
        total_cost=body.quantity * body.unit_cost,
        currency=body.currency,
        status="DRAFT",
        order_date=body.order_date,
        expected_date=body.expected_date,
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
    if po.status != "DRAFT":
        raise HTTPException(status_code=409, detail=f"Cannot mark ordered from status {po.status}")
    po.status = "ORDERED"
    db.commit()
    db.refresh(po)
    return _to_response(po)


@router.post("/{po_id}/receive", response_model=PurchaseOrderResponse)
def receive_purchase_order(po_id: int, db: Session = Depends(get_db)):
    try:
        po = receive_purchase_order_sync(po_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
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
    if po.status not in ("DRAFT", "ORDERED"):
        raise HTTPException(status_code=409, detail=f"Cannot cancel from status {po.status}")
    po.status = "CANCELLED"
    db.commit()
    db.refresh(po)
    return _to_response(po)
