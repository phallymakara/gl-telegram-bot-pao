from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.api.schemas import DailyInventoryCreate, DailyInventoryResponse
from app.models.daily_inventory import DailyInventory

router = APIRouter()

MAX_ROWS = 30


@router.get("/", response_model=list[DailyInventoryResponse])
def list_inventory(
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(DailyInventory)
    if year is not None:
        query = query.filter(func.extract("year", DailyInventory.inventory_date) == year)
    if month is not None:
        query = query.filter(func.extract("month", DailyInventory.inventory_date) == month)
    return query.order_by(DailyInventory.inventory_date.desc()).all()


@router.post("/", response_model=DailyInventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory(body: DailyInventoryCreate, db: Session = Depends(get_db)):
    count = db.query(DailyInventory).count()
    if count >= MAX_ROWS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Maximum of {MAX_ROWS} inventory rows reached.",
        )
    existing = db.query(DailyInventory).filter(DailyInventory.inventory_date == body.inventory_date).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An inventory row already exists for this date.",
        )
    row = DailyInventory(inventory_date=body.inventory_date, stock_kg=body.stock_kg)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{row_id}", response_model=DailyInventoryResponse)
def update_inventory(row_id: int, body: DailyInventoryCreate, db: Session = Depends(get_db)):
    row = db.query(DailyInventory).filter(DailyInventory.id == row_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Inventory row not found")
    existing = (
        db.query(DailyInventory)
        .filter(
            DailyInventory.inventory_date == body.inventory_date,
            DailyInventory.id != row_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An inventory row already exists for this date.",
        )
    row.inventory_date = body.inventory_date
    row.stock_kg = body.stock_kg
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{row_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory(row_id: int, db: Session = Depends(get_db)):
    row = db.query(DailyInventory).filter(DailyInventory.id == row_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Inventory row not found")
    db.delete(row)
    db.commit()
