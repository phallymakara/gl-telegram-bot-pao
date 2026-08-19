"""
Sales Persons API Endpoints.
Provides CRUD operations for sales person master data.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.models.sales_person import SalesPerson
from app.schemas.sales_person import SalesPersonCreate, SalesPersonResponse, SalesPersonUpdate

router = APIRouter()


@router.get("/", response_model=list[SalesPersonResponse])
def get_sales_persons(db: Session = Depends(get_db)):
    """Fetch list of all sales persons ordered by ID descending."""
    return db.query(SalesPerson).order_by(SalesPerson.id.desc()).all()


@router.post("/", response_model=SalesPersonResponse, status_code=status.HTTP_201_CREATED)
def create_sales_person(data: SalesPersonCreate, db: Session = Depends(get_db)):
    """Create a new sales person entry."""
    sp = SalesPerson(**data.model_dump())
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return sp


@router.get("/{sp_id}", response_model=SalesPersonResponse)
def get_sales_person(sp_id: int, db: Session = Depends(get_db)):
    """Fetch single sales person by ID."""
    sp = db.query(SalesPerson).filter(SalesPerson.id == sp_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Sales Person not found")
    return sp


@router.put("/{sp_id}", response_model=SalesPersonResponse)
def update_sales_person(sp_id: int, data: SalesPersonUpdate, db: Session = Depends(get_db)):
    """Update sales person details."""
    sp = db.query(SalesPerson).filter(SalesPerson.id == sp_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Sales Person not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sp, key, value)

    db.commit()
    db.refresh(sp)
    return sp


@router.delete("/{sp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sales_person(sp_id: int, db: Session = Depends(get_db)):
    """Delete a sales person record."""
    sp = db.query(SalesPerson).filter(SalesPerson.id == sp_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Sales Person not found")
    db.delete(sp)
    db.commit()
    return None
