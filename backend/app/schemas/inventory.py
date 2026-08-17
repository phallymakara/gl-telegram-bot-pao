from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class DailyInventoryCreate(BaseModel):
    inventory_date: date
    stock_kg: Decimal


class DailyInventoryResponse(BaseModel):
    id: int
    reference: str | None = None
    inventory_date: date | str
    party: str | None = None
    name: str | None = None
    stock_kg: Decimal
    total_amount: Decimal | None = None
    notes: str | None = None
    created_at: datetime | str | None = None
    updated_at: datetime | str | None = None

    model_config = {"from_attributes": True}
