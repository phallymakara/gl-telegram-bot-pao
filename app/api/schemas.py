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
    channel: str | None = None
    telegram_user_id: str | None = None
    username: str | None = None
    spot_price: Decimal | None = None
    total_amount: Decimal | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    order_no: str | None = None
    transaction_type: str
    quantity: Decimal
    premium: Decimal = Decimal(0)
    customer_name: str | None = None
    slot_date_str: str | None = None
    channel: str | None = "TELEGRAM"
    spot_price: Decimal | None = None
    total_amount: Decimal | None = None


class OrderUpdate(BaseModel):
    quantity: Decimal | None = None
    premium: Decimal | None = None
    customer_name: str | None = None
    status: str | None = None
    channel: str | None = None


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


class SupplierCreate(BaseModel):
    name: str
    supplier_type: str
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


class PurchaseOrderCreate(BaseModel):
    po_type: str
    supplier_id: int | None = None
    supplier_name: str | None = None
    slot_table_id: int | None = None
    quantity: Decimal
    spot_price: Decimal | None = None
    premium: Decimal | None = None
    unit_cost: Decimal | None = None
    currency: str = "USD"
    order_date: date | None = None
    expected_date: date | None = None
    received_date: date | None = None
    notes: str | None = None
    shipping_method: str | None = None
    tracking_no: str | None = None
    customs_fee: Decimal | None = None
    port_of_origin: str | None = None


class PurchaseOrderUpdate(BaseModel):
    po_type: str | None = None
    supplier_name: str | None = None
    quantity: Decimal | None = None
    spot_price: Decimal | None = None
    premium: Decimal | None = None
    unit_cost: Decimal | None = None
    order_date: date | None = None
    expected_date: date | None = None
    received_date: date | None = None
    notes: str | None = None
    status: str | None = None


class PurchaseOrderResponse(BaseModel):
    id: int
    po_no: str
    po_type: str
    supplier_id: int | None = None
    supplier_name: str | None = None
    slot_table_id: int | None = None
    slot_table_name: str | None = None
    quantity: Decimal
    spot_price: Decimal | None = None
    premium: Decimal | None = None
    unit_cost: Decimal
    total_cost: Decimal
    currency: str
    status: str
    order_date: date | None
    expected_date: date | None
    received_date: date | None
    notes: str | None
    shipping_method: str | None
    tracking_no: str | None
    customs_fee: Decimal | None
    port_of_origin: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class POReturnRequest(BaseModel):
    quantity: Decimal
    reason: str | None = None


class OrderReturnRequest(BaseModel):
    quantity: Decimal
    reason: str | None = None


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


class DashboardStats(BaseModel):
    total_gold: float
    total_orders: int
    sold_today: int
    buy_today: int
    total_buy_kg: float
    total_sell_kg: float
    physical_stock: float = 100.0
    incoming_po: float = 5.0
    remaining_incoming: float = 0.0
    gold_in_overseas: float = 25.0
    gold_in_local: float = 35.0
    gold_in_customer: float = 15.5
    gold_in_total: float = 75.5
    gold_out_telegram: float = 18.2
    gold_out_phone: float = 12.0
    gold_out_walkin: float = 8.5
    gold_out_total: float = 38.7
    reserved: float = 40.0
    available: float = 60.0
    open_orders: int = 12


class RevenuePoint(BaseModel):
    day: str
    buy: float
    sell: float
