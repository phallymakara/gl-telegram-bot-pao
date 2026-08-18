"""
Customer & Whitelist API routes.
Provides endpoints for retrieving, creating, and removing customer records used for Telegram bot access control.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.customer import Customer

router = APIRouter()


class CustomerCreate(BaseModel):
    """Schema for adding a customer to the bot whitelist."""
    telegram_user_id: str | None = None
    username: str | None = None
    display_name: str | None = None


class CustomerResponse(BaseModel):
    """Schema representing whitelisted customer data."""
    id: int
    telegram_user_id: str | None
    username: str | None
    display_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    """
    Retrieve all whitelisted customers, ordered by creation timestamp descending.
    """
    return db.query(Customer).order_by(Customer.created_at.desc()).all()


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db)):
    """
    Add a new customer to the whitelist.
    Requires at least a telegram_user_id or username for Telegram authorization matching.
    Raises HTTP 409 Conflict if the customer ID or username already exists.
    """
    if not body.telegram_user_id and not body.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least a username or telegram_user_id",
        )

    # Check for existing duplicate telegram_user_id
    if body.telegram_user_id:
        existing = db.query(Customer).filter(Customer.telegram_user_id == body.telegram_user_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer already exists")

    # Check for existing duplicate username
    if body.username:
        existing = db.query(Customer).filter(Customer.username == body.username).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

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
    """
    Remove a customer from the whitelist by ID.
    Returns HTTP 204 No Content upon successful removal.
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    db.delete(customer)
    db.commit()

