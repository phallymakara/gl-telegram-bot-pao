"""
Customer Withdrawals API routes.
Provides endpoints for managing, searching, inspecting, verifying, and approving customer fund withdrawals.
"""

from datetime import datetime
from decimal import Decimal
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.withdrawal import Withdrawal
from app.models.customer import Customer
from app.schemas.withdrawal import (
    WithdrawalCreate,
    WithdrawalResponse,
    WithdrawalReviewRequest,
    WithdrawalStatsResponse,
)
from app.utils.generators import generate_withdraw_no

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=list[WithdrawalResponse])
def list_withdrawals(
    status: Optional[str] = Query(None, description="Filter by status: PENDING, APPROVED, REJECTED"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method: BANK, CASH"),
    search: Optional[str] = Query(None, description="Search by withdraw_no, account_name, or username"),
    db: Session = Depends(get_db),
):
    """
    Retrieve all customer withdrawals with optional filtering and search.
    If database contains no withdrawals, initializes default demo withdrawal.
    """
    total_count = db.query(Withdrawal).count()
    if total_count == 0:
        demo_customer = db.query(Customer).filter(Customer.telegram_user_id == "123456001").first()
        demo_withdrawal = Withdrawal(
            withdraw_no="WTH-92B1C40A",
            customer_id=demo_customer.id if demo_customer else None,
            telegram_user_id="123456001",
            username="makara",
            account_name="PHALLY MAKARA",
            amount=Decimal("5000.00"),
            currency="USD",
            payment_method="BANK",
            receipt_url=None,
            status="PENDING",
            notes="Customer requested withdrawal via Telegram bot (Bank Transfer to ABA)",
            transaction_date=datetime.now(),
        )
        db.add(demo_withdrawal)
        db.commit()
        db.refresh(demo_withdrawal)

    query = db.query(Withdrawal)

    if status and status != "All Statuses":
        query = query.filter(Withdrawal.status == status.upper())

    if payment_method and payment_method != "All Methods":
        query = query.filter(Withdrawal.payment_method == payment_method.upper())

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Withdrawal.withdraw_no.ilike(s))
            | (Withdrawal.account_name.ilike(s))
            | (Withdrawal.username.ilike(s))
        )

    return query.order_by(Withdrawal.transaction_date.desc(), Withdrawal.id.desc()).all()


@router.get("/stats", response_model=WithdrawalStatsResponse)
def get_withdrawal_stats(db: Session = Depends(get_db)):
    """
    Retrieve aggregate statistics for customer withdrawals:
    Total, pending, approved, and rejected counts and volume.
    """
    all_withdrawals = db.query(Withdrawal).all()

    total_count = len(all_withdrawals)
    total_amount = sum((w.amount for w in all_withdrawals), Decimal("0"))

    pending = [w for w in all_withdrawals if w.status == "PENDING"]
    approved = [w for w in all_withdrawals if w.status == "APPROVED"]
    rejected = [w for w in all_withdrawals if w.status == "REJECTED"]

    return WithdrawalStatsResponse(
        total_count=total_count,
        total_amount=total_amount,
        pending_count=len(pending),
        pending_amount=sum((w.amount for w in pending), Decimal("0")),
        approved_count=len(approved),
        approved_amount=sum((w.amount for w in approved), Decimal("0")),
        rejected_count=len(rejected),
        rejected_amount=sum((w.amount for w in rejected), Decimal("0")),
    )


@router.get("/{withdrawal_id}", response_model=WithdrawalResponse)
def get_withdrawal(withdrawal_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific withdrawal record by ID.
    """
    withdrawal = db.query(Withdrawal).filter(Withdrawal.id == withdrawal_id).first()
    if not withdrawal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal record not found")
    return withdrawal


@router.post("/", response_model=WithdrawalResponse, status_code=status.HTTP_201_CREATED)
def create_withdrawal(body: WithdrawalCreate, db: Session = Depends(get_db)):
    """
    Create a new customer withdrawal record.
    Generates unique WTH-XXXXXXXX transaction reference if not explicitly provided.
    """
    txn_id = body.withdraw_no or generate_withdraw_no()

    withdrawal = Withdrawal(
        withdraw_no=txn_id,
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
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)
    return withdrawal


@router.patch("/{withdrawal_id}/status", response_model=WithdrawalResponse)
@router.put("/{withdrawal_id}/status", response_model=WithdrawalResponse)
def review_withdrawal(
    withdrawal_id: int,
    body: WithdrawalReviewRequest,
    db: Session = Depends(get_db),
):
    """
    Review and approve or reject a customer withdrawal transaction.
    Records reviewer username, payout notes / bank reference, and approval timestamp.
    """
    withdrawal = db.query(Withdrawal).filter(Withdrawal.id == withdrawal_id).first()
    if not withdrawal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found")

    new_status = body.status.upper()
    if new_status not in ("APPROVED", "REJECTED", "PENDING"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    withdrawal.status = new_status
    if body.notes is not None:
        withdrawal.notes = body.notes
    if body.receipt_url is not None:
        withdrawal.receipt_url = body.receipt_url
    withdrawal.reviewed_by = body.reviewed_by or "Admin"
    withdrawal.reviewed_at = datetime.now()

    db.commit()
    db.refresh(withdrawal)
    logger.info("Withdrawal %s reviewed: status=%s by %s", withdrawal.withdraw_no, withdrawal.status, withdrawal.reviewed_by)
    return withdrawal


@router.delete("/{withdrawal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_withdrawal(withdrawal_id: int, db: Session = Depends(get_db)):
    """
    Delete a withdrawal record by ID.
    """
    withdrawal = db.query(Withdrawal).filter(Withdrawal.id == withdrawal_id).first()
    if not withdrawal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found")
    db.delete(withdrawal)
    db.commit()
