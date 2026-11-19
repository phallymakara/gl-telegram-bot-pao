"""
Customer & Whitelist API routes.
Provides endpoints for retrieving, creating, updating, and removing customer records.
"""

import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.customer import Customer
from app.services.activity_log_service import log_activity

router = APIRouter()


class CustomerCreate(BaseModel):
    """Schema for adding a new customer master data record or whitelist entry."""
    customer_code: str | None = None
    customer_type: str | None = "Individual"
    name: str | None = None
    contact: str | None = None
    sex: str | None = None
    dob: str | None = None
    nation: str | None = None
    address: str | None = None
    is_active: bool = True
    telegram_user_id: str | None = None
    username: str | None = None
    display_name: str | None = None


class CustomerUpdate(BaseModel):
    """Schema for updating an existing customer record."""
    customer_code: str | None = None
    customer_type: str | None = None
    name: str | None = None
    contact: str | None = None
    sex: str | None = None
    dob: str | None = None
    nation: str | None = None
    address: str | None = None
    is_active: bool | None = None
    telegram_user_id: str | None = None
    username: str | None = None
    display_name: str | None = None


class CustomerResponse(BaseModel):
    """Schema representing customer master data."""
    id: int
    customer_code: str | None = None
    customer_type: str | None = "Individual"
    name: str | None = None
    contact: str | None = None
    sex: str | None = None
    dob: str | None = None
    nation: str | None = None
    address: str | None = None
    is_active: bool = True
    telegram_user_id: str | None = None
    username: str | None = None
    display_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BulkCustomerItem(BaseModel):
    """Schema for individual customer item in bulk import request."""
    customer_code: str | None = None
    customer_type: str | None = "Individual"
    name: str | None = None
    contact: str | None = None
    sex: str | None = None
    dob: str | None = None
    nation: str | None = None
    address: str | None = None
    is_active: bool = True
    telegram_user_id: str | None = None
    username: str | None = None
    display_name: str | None = None


class BulkImportResponse(BaseModel):
    """Schema for customer bulk import response status."""
    success: bool
    imported_count: int
    skipped_count: int
    message: str


@router.post("/bulk", response_model=BulkImportResponse)
def bulk_create_customers(items: list[BulkCustomerItem], db: Session = Depends(get_db)):
    """
    Bulk import multiple customer master data records.
    """
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No customer records provided")

    imported = 0
    skipped = 0

    existing_codes = {c[0] for c in db.query(Customer.customer_code).filter(Customer.customer_code.isnot(None)).all() if c[0]}
    existing_usernames = {c[0] for c in db.query(Customer.username).filter(Customer.username.isnot(None)).all() if c[0]}

    max_num = 0
    for code in existing_codes:
        m = re.search(r"CUST-?(\d+)", code, re.IGNORECASE)
        if m:
            val = int(m.group(1))
            if val > max_num:
                max_num = val

    new_customers = []
    for item in items:
        customer_name = (item.name or item.display_name or item.username or "").strip()
        if not customer_name:
            skipped += 1
            continue

        code = item.customer_code.strip() if item.customer_code else None
        if not code:
            max_num += 1
            code = f"CUST-{max_num:03d}"
        elif code in existing_codes:
            skipped += 1
            continue

        if item.username and item.username in existing_usernames:
            skipped += 1
            continue

        existing_codes.add(code)
        if item.username:
            existing_usernames.add(item.username)

        customer = Customer(
            customer_code=code,
            customer_type=item.customer_type or "Individual",
            name=customer_name,
            contact=item.contact,
            sex=item.sex,
            dob=item.dob,
            nation=item.nation,
            address=item.address,
            is_active=item.is_active,
            telegram_user_id=item.telegram_user_id,
            username=item.username,
            display_name=item.display_name or customer_name,
        )
        new_customers.append(customer)
        imported += 1

    if new_customers:
        db.add_all(new_customers)
        db.commit()
        log_activity(
            db,
            action="CUSTOMER_BULK_IMPORT",
            category="MASTER_DATA",
            description=f"Bulk imported {imported} customer records (skipped {skipped})",
            entity_type="Customer",
            entity_id=None,
            details={"imported_count": imported, "skipped_count": skipped},
        )

    return BulkImportResponse(
        success=True,
        imported_count=imported,
        skipped_count=skipped,
        message=f"Successfully imported {imported} customer(s)" + (f" ({skipped} skipped)" if skipped else ""),
    )


@router.get("/", response_model=list[CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    """
    Retrieve all customer master records, ordered by creation timestamp descending.
    """
    return db.query(Customer).order_by(Customer.created_at.desc()).all()


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single customer record by ID.
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db)):
    """
    Add a new customer master data record.
    """
    # Check for existing duplicate telegram_user_id if provided
    if body.telegram_user_id:
        existing = db.query(Customer).filter(Customer.telegram_user_id == body.telegram_user_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer Telegram ID already exists")

    # Check for existing duplicate username if provided
    if body.username:
        existing = db.query(Customer).filter(Customer.username == body.username).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    customer_name = body.name or body.display_name or body.username or body.customer_code or "New Customer"

    customer = Customer(
        customer_code=body.customer_code,
        customer_type=body.customer_type or "Individual",
        name=customer_name,
        contact=body.contact,
        sex=body.sex,
        dob=body.dob,
        nation=body.nation,
        address=body.address,
        is_active=body.is_active,
        telegram_user_id=body.telegram_user_id,
        username=body.username,
        display_name=body.display_name or customer_name,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    log_activity(
        db,
        action="CUSTOMER_CREATED",
        category="MASTER_DATA",
        description=f"Created customer '{customer.name}'",
        entity_type="Customer",
        entity_id=customer.id,
        details={"customer_code": customer.customer_code, "name": customer.name},
    )
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, body: CustomerUpdate, db: Session = Depends(get_db)):
    """
    Update an existing customer master record by ID.
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    if body.customer_code is not None:
        customer.customer_code = body.customer_code
    if body.customer_type is not None:
        customer.customer_type = body.customer_type
    if body.name is not None:
        customer.name = body.name
    if body.contact is not None:
        customer.contact = body.contact
    if body.sex is not None:
        customer.sex = body.sex
    if body.dob is not None:
        customer.dob = body.dob
    if body.nation is not None:
        customer.nation = body.nation
    if body.address is not None:
        customer.address = body.address
    if body.is_active is not None:
        customer.is_active = body.is_active
    if body.telegram_user_id is not None:
        customer.telegram_user_id = body.telegram_user_id
    if body.username is not None:
        customer.username = body.username
    if body.display_name is not None:
        customer.display_name = body.display_name

    db.commit()
    db.refresh(customer)
    log_activity(
        db,
        action="CUSTOMER_UPDATED",
        category="MASTER_DATA",
        description=f"Updated customer '{customer.name}'",
        entity_type="Customer",
        entity_id=customer.id,
        details={"is_active": customer.is_active},
    )
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """
    Remove a customer record by ID.
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    name = customer.name
    db.delete(customer)
    db.commit()
    log_activity(
        db,
        action="CUSTOMER_DELETED",
        category="MASTER_DATA",
        description=f"Deleted customer '{name}'",
        entity_type="Customer",
        entity_id=customer_id,
    )
