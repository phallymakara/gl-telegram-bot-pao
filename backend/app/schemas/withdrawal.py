"""
Withdrawal Pydantic Schemas.
Validates input request payloads and standardizes serialized API response formats for customer withdrawals.
"""

from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class WithdrawalCreate(BaseModel):
    withdraw_no: str | None = None
    customer_id: int | None = None
    telegram_user_id: str | None = None
    username: str | None = None
    account_name: str
    amount: Decimal
    currency: str = "USD"
    payment_method: str = "BANK"
    receipt_url: str | None = None
    telegram_file_id: str | None = None
    notes: str | None = None


class WithdrawalReviewRequest(BaseModel):
    status: str  # APPROVED, REJECTED, PENDING
    notes: str | None = None
    reviewed_by: str | None = None
    receipt_url: str | None = None


class WithdrawalCustomerSummary(BaseModel):
    id: int
    name: str | None
    contact: str | None
    customer_code: str | None

    model_config = {"from_attributes": True}


class WithdrawalResponse(BaseModel):
    id: int
    withdraw_no: str
    customer_id: int | None
    telegram_user_id: str | None
    username: str | None
    account_name: str
    amount: Decimal
    currency: str
    payment_method: str
    receipt_url: str | None
    telegram_file_id: str | None
    status: str
    notes: str | None
    reviewed_by: str | None
    reviewed_at: datetime | None
    transaction_date: datetime
    created_at: datetime
    updated_at: datetime
    customer: WithdrawalCustomerSummary | None = None

    model_config = {"from_attributes": True}


class WithdrawalStatsResponse(BaseModel):
    total_count: int
    total_amount: Decimal
    pending_count: int
    pending_amount: Decimal
    approved_count: int
    approved_amount: Decimal
    rejected_count: int
    rejected_amount: Decimal
