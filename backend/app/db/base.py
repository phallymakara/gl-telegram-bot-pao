"""
Database Model Registry Aggregator.
Imports all SQLAlchemy ORM models to ensure they are registered with Base.metadata before database initialization.
"""

from app.core.database import Base

# Imports register ORM models for Alembic migrations and Base.metadata.create_all()
from app.models.alert import Alert
from app.models.customer import Customer
from app.models.daily_inventory import DailyInventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.models.purchase_order import PurchaseOrder
from app.models.slot_row import SlotRow
from app.models.slot_table import SlotTable
from app.models.stock_return import StockReturn
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.telegram_group import TelegramGroup
from app.models.user import User
