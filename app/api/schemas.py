from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


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
    created_at: datetime

    model_config = {"from_attributes": True}


class SlotRowCreate(BaseModel):
    slot_date: date
    premium: Decimal


class SlotRowResponse(BaseModel):
    id: int
    slot_date: date
    premium: Decimal

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
    rows: list[SlotRowResponse]

    model_config = {"from_attributes": True}


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


class DashboardStats(BaseModel):
    total_gold: float
    total_orders: int
    sold_today: int
    buy_today: int
    total_buy_kg: float
    total_sell_kg: float


class RevenuePoint(BaseModel):
    day: str
    buy: float
    sell: float
