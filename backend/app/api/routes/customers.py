from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.dependencies import get_db
from app.models.customer import Customer

router = APIRouter()


class CustomerCreate(BaseModel):
    telegram_user_id: str | None = None
    username: str | None = None
    display_name: str | None = None


class CustomerResponse(BaseModel):
    id: int
    telegram_user_id: str | None
    username: str | None
    display_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.created_at.desc()).all()


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db)):
    if not body.telegram_user_id and not body.username:
        raise HTTPException(status_code=400, detail="Provide at least a username or telegram_user_id")
    if body.telegram_user_id:
        existing = db.query(Customer).filter(Customer.telegram_user_id == body.telegram_user_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Customer already exists")
    if body.username:
        existing = db.query(Customer).filter(Customer.username == body.username).first()
        if existing:
            raise HTTPException(status_code=409, detail="Username already exists")
    customer = Customer(
        telegram_user_id=body.telegram_user_id,
        username=body.username,
        display_name=body.display_name or body.username,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
