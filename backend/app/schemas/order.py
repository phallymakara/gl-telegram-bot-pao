from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class OrderCreate(BaseModel):
    order_no: str | None = None
    transaction_type: str
    quantity: Decimal
    premium: Decimal = Decimal(0)
    customer_name: str | None = None
    slot_date_str: str | None = None
    channel: str | None = "TELEGRAM"
    spot_price: Decimal | None = None
    total_amount: Decimal | None = None


class OrderUpdate(BaseModel):
    quantity: Decimal | None = None
    premium: Decimal | None = None
    customer_name: str | None = None
    status: str | None = None
    channel: str | None = None


class OrderResponse(BaseModel):
    id: int
    order_no: str
    customer_name: str | None = None
    group_name: str | None = None
    slot_date: date | None = None
    quantity: Decimal
    premium: Decimal
    premium_amount: Decimal
    transaction_type: str
    status: str
    channel: str | None = None
    telegram_user_id: str | None = None
    username: str | None = None
    spot_price: Decimal | None = None
    total_amount: Decimal | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderReturnRequest(BaseModel):
    quantity: Decimal
    reason: str | None = None
