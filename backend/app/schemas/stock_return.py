from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class StockReturnResponse(BaseModel):
    id: int
    return_no: str
    return_type: str
    purchase_order_id: int | None
    order_id: int | None
    slot_table_id: int
    quantity: Decimal
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
