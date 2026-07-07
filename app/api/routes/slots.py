from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_db
from app.api.schemas import SlotTableCreate, SlotTableResponse, SlotRowCreate, SlotRowResponse
from app.models.slot_table import SlotTable
from app.models.slot_row import SlotRow

router = APIRouter()


@router.get("/", response_model=list[SlotTableResponse])
def list_tables(db: Session = Depends(get_db)):
    tables = db.query(SlotTable).options(joinedload(SlotTable.rows)).order_by(SlotTable.display_order).all()
    return tables


@router.post("/", response_model=SlotTableResponse, status_code=status.HTTP_201_CREATED)
def create_table(body: SlotTableCreate, db: Session = Depends(get_db)):
    max_order = db.query(SlotTable.display_order).order_by(SlotTable.display_order.desc()).first()
    table = SlotTable(
        table_name=body.table_name,
        stock=body.stock,
        display_order=(max_order[0] + 1) if max_order else 0,
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    return table


@router.put("/{table_id}", response_model=SlotTableResponse)
def update_table(table_id: int, body: SlotTableCreate, db: Session = Depends(get_db)):
    table = db.query(SlotTable).options(joinedload(SlotTable.rows)).filter(SlotTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    table.table_name = body.table_name
    table.stock = body.stock
    db.commit()
    db.refresh(table)
    return table


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_table(table_id: int, db: Session = Depends(get_db)):
    table = db.query(SlotTable).filter(SlotTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    db.delete(table)
    db.commit()


@router.post("/{table_id}/rows", response_model=SlotRowResponse, status_code=status.HTTP_201_CREATED)
def add_row(table_id: int, body: SlotRowCreate, db: Session = Depends(get_db)):
    table = db.query(SlotTable).filter(SlotTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    row = SlotRow(slot_table_id=table_id, slot_date=body.slot_date, premium=body.premium)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{table_id}/rows/{row_id}", response_model=SlotRowResponse)
def update_row(table_id: int, row_id: int, body: SlotRowCreate, db: Session = Depends(get_db)):
    row = db.query(SlotRow).filter(SlotRow.id == row_id, SlotRow.slot_table_id == table_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Row not found")
    row.slot_date = body.slot_date
    row.premium = body.premium
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{table_id}/rows/{row_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_row(table_id: int, row_id: int, db: Session = Depends(get_db)):
    row = db.query(SlotRow).filter(SlotRow.id == row_id, SlotRow.slot_table_id == table_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Row not found")
    db.delete(row)
    db.commit()
