from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.api.schemas import SupplierCreate, SupplierResponse
from app.models.purchase_order import Supplier

router = APIRouter()


@router.get("/", response_model=list[SupplierResponse])
def list_suppliers(supplier_type: str = "", db: Session = Depends(get_db)):
    q = db.query(Supplier)
    if supplier_type:
        q = q.filter(Supplier.supplier_type == supplier_type.upper())
    return q.order_by(Supplier.name).all()


@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(body: SupplierCreate, db: Session = Depends(get_db)):
    supplier = Supplier(
        name=body.name,
        supplier_type=body.supplier_type.upper(),
        contact_person=body.contact_person,
        phone=body.phone,
        email=body.email,
        address=body.address,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: int, body: SupplierCreate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    supplier.name = body.name
    supplier.supplier_type = body.supplier_type.upper()
    supplier.contact_person = body.contact_person
    supplier.phone = body.phone
    supplier.email = body.email
    supplier.address = body.address
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()
