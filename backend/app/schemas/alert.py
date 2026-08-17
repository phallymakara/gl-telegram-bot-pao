from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class AlertCreate(BaseModel):
    type: str
    title: str
    message: str
    premium: Decimal | None = None
    discount: Decimal | None = None
    discount_type: str | None = None
    trigger_stock: Decimal | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    slot_table_id: int | None = None


class AlertResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    premium: Decimal | None
    discount: Decimal | None
    discount_type: str | None
    trigger_stock: Decimal | None
    start_at: datetime | None
    end_at: datetime | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
