from datetime import datetime
from pydantic import BaseModel


class UserCreate(BaseModel):
    name: str
    username: str
    email: str
    password: str
    role: str = "Staff"


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    username: str
    email: str
    role: str
    is_active: bool
    last_login: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
