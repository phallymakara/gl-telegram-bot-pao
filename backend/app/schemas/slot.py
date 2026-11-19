from datetime import date
from decimal import Decimal
from pydantic import BaseModel


class SlotRowCreate(BaseModel):
    slot_date: date
    premium: Decimal
    qty: Decimal | None = Decimal("10.00")
    is_active: bool | None = True


class SlotRowResponse(BaseModel):
    id: int
    slot_date: date
    premium: Decimal
    qty: Decimal | None = Decimal("10.00")
    is_active: bool = True

    model_config = {"from_attributes": True}


class SlotTableCreate(BaseModel):
    table_name: str
    stock: Decimal = Decimal(0)
    buy_limit: Decimal | None = None
    set_limit: Decimal | None = None
    is_active: bool | None = None


class SlotTableResponse(BaseModel):
    id: int
    table_name: str
    stock: Decimal
    buy_limit: Decimal | None = Decimal(0)
    set_limit: Decimal | None = Decimal(0)
    sold: Decimal | None = Decimal(0)
    remaining: Decimal | None = Decimal(0)
    is_active: bool
    display_order: int
    rows: list[SlotRowResponse] = []

    model_config = {"from_attributes": True}
