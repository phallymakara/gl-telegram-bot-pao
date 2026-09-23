"""
Customer Deposits API routes.
Provides endpoints for managing, searching, inspecting, verifying, and approving customer money deposits.
"""

from datetime import datetime
from decimal import Decimal
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.dependencies import get_db
from app.models.deposit import Deposit
from app.models.customer import Customer
from app.schemas.deposit import (
    DepositCreate,
    DepositResponse,
    DepositReviewRequest,
    DepositStatsResponse,
)
from app.utils.generators import generate_deposit_no

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=list[DepositResponse])
def list_deposits(
    status: Optional[str] = Query(None, description="Filter by status: PENDING, APPROVED, REJECTED"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method: BANK, CASH"),
    search: Optional[str] = Query(None, description="Search by deposit_no, account_name, or username"),
    db: Session = Depends(get_db),
):
    """
    Retrieve all customer deposits with optional filtering and search.
    If database contains no deposits, initializes default demo deposit matching the Telegram prompt.
    """
    # Auto-seed initial demo deposit if none exist
    total_count = db.query(Deposit).count()
    if total_count == 0:
        demo_customer = db.query(Customer).filter(Customer.telegram_user_id == "123456001").first()
        demo_deposit = Deposit(
            deposit_no="DEP-61029F0B",
            customer_id=demo_customer.id if demo_customer else None,
            telegram_user_id="123456001",
            username="makara",
            account_name="PHALLY MAKARA",
            amount=Decimal("34934.00"),
            currency="USD",
            payment_method="BANK",
            receipt_url=None,
            status="PENDING",
            notes="Customer submitted payment slip via Telegram bot (Bank Transfer)",
            transaction_date=datetime.now(),
        )
        db.add(demo_deposit)
        db.commit()
        db.refresh(demo_deposit)

    query = db.query(Deposit)

    if status and status != "All Statuses":
        query = query.filter(Deposit.status == status.upper())

    if payment_method and payment_method != "All Methods":
        query = query.filter(Deposit.payment_method == payment_method.upper())

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Deposit.deposit_no.ilike(s))
            | (Deposit.account_name.ilike(s))
            | (Deposit.username.ilike(s))
        )

    return query.order_by(Deposit.transaction_date.desc(), Deposit.id.desc()).all()


@router.get("/stats", response_model=DepositStatsResponse)
def get_deposit_stats(db: Session = Depends(get_db)):
    """
    Retrieve aggregate statistics for customer deposits:
    Total, pending, approved, and rejected counts and volume.
    """
    all_deposits = db.query(Deposit).all()

    total_count = len(all_deposits)
    total_amount = sum((d.amount for d in all_deposits), Decimal("0"))

    pending = [d for d in all_deposits if d.status == "PENDING"]
    approved = [d for d in all_deposits if d.status == "APPROVED"]
    rejected = [d for d in all_deposits if d.status == "REJECTED"]

    return DepositStatsResponse(
        total_count=total_count,
        total_amount=total_amount,
        pending_count=len(pending),
        pending_amount=sum((d.amount for d in pending), Decimal("0")),
        approved_count=len(approved),
        approved_amount=sum((d.amount for d in approved), Decimal("0")),
        rejected_count=len(rejected),
        rejected_amount=sum((d.amount for d in rejected), Decimal("0")),
    )


@router.get("/{deposit_id}", response_model=DepositResponse)
def get_deposit(deposit_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific deposit record by ID.
    """
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deposit record not found")
    return deposit


@router.post("/", response_model=DepositResponse, status_code=status.HTTP_201_CREATED)
def create_deposit(body: DepositCreate, db: Session = Depends(get_db)):
    """
    Create a new customer deposit record.
    Generates unique DEP-XXXXXXXX transaction reference if not explicitly provided.
    """
    txn_id = body.deposit_no or generate_deposit_no()

    deposit = Deposit(
        deposit_no=txn_id,
        customer_id=body.customer_id,
        telegram_user_id=body.telegram_user_id,
        username=body.username,
        account_name=body.account_name,
        amount=body.amount,
        currency=body.currency,
        payment_method=body.payment_method.upper(),
        receipt_url=body.receipt_url,
        telegram_file_id=body.telegram_file_id,
        status="PENDING",
        notes=body.notes,
    )
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    return deposit


@router.patch("/{deposit_id}/status", response_model=DepositResponse)
@router.put("/{deposit_id}/status", response_model=DepositResponse)
def review_deposit(
    deposit_id: int,
    body: DepositReviewRequest,
    db: Session = Depends(get_db),
):
    """
    Review and approve or reject a customer deposit transaction.
    Records reviewer username, audit notes, and approval timestamp.
    """
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deposit not found")

    new_status = body.status.upper()
    if new_status not in ("APPROVED", "REJECTED", "PENDING"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    deposit.status = new_status
    if body.notes is not None:
        deposit.notes = body.notes
    deposit.reviewed_by = body.reviewed_by or "Admin"
    deposit.reviewed_at = datetime.now()

    db.commit()
    db.refresh(deposit)
    logger.info("Deposit %s reviewed: status=%s by %s", deposit.deposit_no, deposit.status, deposit.reviewed_by)
    return deposit


@router.delete("/{deposit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deposit(deposit_id: int, db: Session = Depends(get_db)):
    """
    Delete a deposit record by ID.
    """
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deposit not found")
    db.delete(deposit)
    db.commit()
