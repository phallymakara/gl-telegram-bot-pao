from datetime import date
from decimal import Decimal
from pydantic import BaseModel


class SlotRowCreate(BaseModel):
    slot_date: date
    premium: Decimal
    qty: Decimal | None = Decimal("10.00")


class SlotRowResponse(BaseModel):
    id: int
    slot_date: date
    premium: Decimal
    qty: Decimal | None = Decimal("10.00")

    model_config = {"from_attributes": True}


class SlotTableCreate(BaseModel):
    table_name: str
    stock: Decimal = 0


class SlotTableResponse(BaseModel):
    id: int
    table_name: str
    stock: Decimal
    is_active: bool
    display_order: int
    rows: list[SlotRowResponse] = []

    model_config = {"from_attributes": True}
