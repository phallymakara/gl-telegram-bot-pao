from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderReturnRequest
from app.schemas.slot import SlotRowCreate, SlotRowResponse, SlotTableCreate, SlotTableResponse
from app.schemas.alert import AlertCreate, AlertResponse
from app.schemas.inventory import DailyInventoryCreate, DailyInventoryResponse
from app.schemas.supplier import SupplierCreate, SupplierResponse
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse, POReturnRequest
from app.schemas.stock_return import StockReturnResponse
from app.schemas.dashboard import DashboardStats, RevenuePoint

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "OrderCreate",
    "OrderUpdate",
    "OrderResponse",
    "OrderReturnRequest",
    "SlotRowCreate",
    "SlotRowResponse",
    "SlotTableCreate",
    "SlotTableResponse",
    "AlertCreate",
    "AlertResponse",
    "DailyInventoryCreate",
    "DailyInventoryResponse",
    "SupplierCreate",
    "SupplierResponse",
    "PurchaseOrderCreate",
    "PurchaseOrderUpdate",
    "PurchaseOrderResponse",
    "POReturnRequest",
    "StockReturnResponse",
    "DashboardStats",
    "RevenuePoint",
]
