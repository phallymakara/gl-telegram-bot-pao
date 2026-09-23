from datetime import datetime
from pydantic import BaseModel


class UserCreate(BaseModel):
    name: str
    username: str
    email: str
    password: str
    role: str = "Staff"
    is_active: bool = True
    allowed_modules: list[str] = []


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None
    allowed_modules: list[str] | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    username: str
    email: str
    role: str
    is_active: bool
    allowed_modules: list[str] | None = None
    last_login: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
