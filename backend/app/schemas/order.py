"""
Customer Order Pydantic DTO Schemas.
Defines validation schemas for order creation, updates, responses, and customer returns.
"""

from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class OrderCreate(BaseModel):
    """Schema for creating a new customer order."""
    order_no: str | None = None
    transaction_type: str | None = "SELL"
    quantity: Decimal | None = None
    premium: Decimal = Decimal(0)
    customer_name: str | None = None
    sales_person: str | None = None
    slot_date_str: str | None = None
    channel: str | None = "TELEGRAM"
    region: str | None = "LOCAL"
    status: str | None = "CONFIRMED"
    spot_price: Decimal | None = None
    total_amount: Decimal | None = None


class OrderUpdate(BaseModel):
    """Schema for updating an existing customer order."""
    order_no: str | None = None
    transaction_type: str | None = None
    quantity: Decimal | None = None
    premium: Decimal | None = None
    customer_name: str | None = None
    sales_person: str | None = None
    status: str | None = None
    channel: str | None = None
    region: str | None = None
    spot_price: Decimal | None = None
    total_amount: Decimal | None = None


class OrderResponse(BaseModel):
    """Schema representing detailed order response payload."""
    id: int
    order_no: str
    customer_name: str | None = None
    sales_person: str | None = None
    group_name: str | None = None
    slot_date: date | None = None
    quantity: Decimal
    premium: Decimal
    premium_amount: Decimal
    transaction_type: str
    status: str
    channel: str | None = None
    region: str | None = None
    telegram_user_id: str | None = None
    username: str | None = None
    spot_price: Decimal | None = None
    total_amount: Decimal | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderReturnRequest(BaseModel):
    """Schema for requesting a customer order stock return."""
    quantity: Decimal
    reason: str | None = None

