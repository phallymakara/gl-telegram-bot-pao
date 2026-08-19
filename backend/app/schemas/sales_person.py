"""
Sales Person DTO Schemas.
"""

from datetime import datetime
from pydantic import BaseModel


class SalesPersonCreate(BaseModel):
    code: str | None = None
    name: str
    phone: str | None = None
    email: str | None = None
    gender: str | None = None
    address: str | None = None
    is_active: bool = True


class SalesPersonUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    gender: str | None = None
    address: str | None = None
    is_active: bool | None = None


class SalesPersonResponse(BaseModel):
    id: int
    code: str | None = None
    name: str
    phone: str | None = None
    email: str | None = None
    gender: str | None = None
    address: str | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
