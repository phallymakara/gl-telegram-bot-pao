"""
Slot Tables & Slot Rows Management API routes.
Provides endpoints for managing trading slot tables (SELL / BUY tables) and date-based premium rows.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_db
from app.api.schemas import SlotRowCreate, SlotRowResponse, SlotTableCreate, SlotTableResponse
from app.models.alert import Alert
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.models.purchase_order import PurchaseOrder, StockReturn
from app.models.slot_row import SlotRow
from app.models.slot_table import SlotTable

router = APIRouter()


def _raise_if_slot_referenced(db: Session, row_id: int) -> None:
    """Helper safety check throwing HTTP 409 if active orders reference a slot row."""
    refs = db.query(Order.id).filter(Order.slot_id == row_id).count()
    if refs:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete: {refs} order(s) reference this slot.",
        )


@router.get("/", response_model=list[SlotTableResponse])
def list_tables(db: Session = Depends(get_db)):
    """
    Retrieve all slot tables with eager-loaded slot rows, ordered by display order.
    """
    tables = db.query(SlotTable).options(joinedload(SlotTable.rows)).order_by(SlotTable.display_order).all()
    return tables


@router.post("/", response_model=SlotTableResponse, status_code=status.HTTP_201_CREATED)
def create_table(body: SlotTableCreate, db: Session = Depends(get_db)):
    """
    Create a new slot table (e.g. SELL Table, BUY Table) with initial stock.
    Calculates next display order position automatically.
    """
    max_order = db.query(SlotTable.display_order).order_by(SlotTable.display_order.desc()).first()
    table = SlotTable(
        table_name=body.table_name,
        stock=body.stock,
        display_order=(max_order[0] + 1) if max_order else 0,
    )
    db.add(table)
    db.commit()
    return db.query(SlotTable).options(joinedload(SlotTable.rows)).filter(SlotTable.id == table.id).first()


@router.put("/{table_id}", response_model=SlotTableResponse)
def update_table(table_id: int, body: SlotTableCreate, db: Session = Depends(get_db)):
    """
    Update slot table name or available physical stock.
    """
    table = db.query(SlotTable).options(joinedload(SlotTable.rows)).filter(SlotTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    table.table_name = body.table_name
    table.stock = body.stock
    db.commit()
    return db.query(SlotTable).options(joinedload(SlotTable.rows)).filter(SlotTable.id == table_id).first()


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_table(table_id: int, db: Session = Depends(get_db)):
    """
    Delete a slot table and clean up foreign key references across transactions, POs, alerts, and orders.
    """
    table = db.query(SlotTable).options(joinedload(SlotTable.rows)).filter(SlotTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

    # Clean up dependent transactions and disassociate foreign keys before deleting table
    db.query(InventoryTransaction).filter(InventoryTransaction.slot_table_id == table_id).delete(synchronize_session=False)
    db.query(StockReturn).filter(StockReturn.slot_table_id == table_id).delete(synchronize_session=False)
    db.query(PurchaseOrder).filter(PurchaseOrder.slot_table_id == table_id).update({"slot_table_id": None}, synchronize_session=False)
    db.query(Alert).filter(Alert.slot_table_id == table_id).update({"slot_table_id": None}, synchronize_session=False)

    for row in table.rows:
        db.query(Order).filter(Order.slot_id == row.id).update({"slot_id": None}, synchronize_session=False)

    db.delete(table)
    db.commit()


@router.post("/{table_id}/rows", response_model=SlotRowResponse, status_code=status.HTTP_201_CREATED)
def add_row(table_id: int, body: SlotRowCreate, db: Session = Depends(get_db)):
    """
    Add a new date-based premium row to a slot table.
    """
    table = db.query(SlotTable).filter(SlotTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    row = SlotRow(slot_table_id=table_id, slot_date=body.slot_date, premium=body.premium, qty=body.qty)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{table_id}/rows/{row_id}", response_model=SlotRowResponse)
def update_row(table_id: int, row_id: int, body: SlotRowCreate, db: Session = Depends(get_db)):
    """
    Update slot date, premium value, or available quantity for a slot row.
    """
    row = db.query(SlotRow).filter(SlotRow.id == row_id, SlotRow.slot_table_id == table_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Row not found")
    row.slot_date = body.slot_date
    row.premium = body.premium
    if body.qty is not None:
        row.qty = body.qty
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{table_id}/rows/{row_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_row(table_id: int, row_id: int, db: Session = Depends(get_db)):
    """
    Remove a slot row from a slot table and nullify references on existing orders.
    """
    row = db.query(SlotRow).filter(SlotRow.id == row_id, SlotRow.slot_table_id == table_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Row not found")
    db.query(Order).filter(Order.slot_id == row_id).update({"slot_id": None}, synchronize_session=False)
    db.delete(row)
    db.commit()

