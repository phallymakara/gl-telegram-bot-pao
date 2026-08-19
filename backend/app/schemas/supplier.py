from datetime import datetime
from pydantic import BaseModel


class SupplierCreate(BaseModel):
    name: str
    supplier_type: str = "LOCAL"
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None


class SupplierResponse(BaseModel):
    id: int
    name: str
    supplier_type: str
    contact_person: str | None
    phone: str | None
    email: str | None
    address: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
