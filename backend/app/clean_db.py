"""
Database Reset & Clean Initialization Utility.
Wipes demo transactions, orders, POs, and customer records while initializing clean active slot tables (SELL & BUY) for fresh live operations.
"""

import glob
import logging
import os
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import delete

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.alert import Alert
from app.models.customer import Customer
from app.models.daily_inventory import DailyInventory
from app.models.delivery_note import DeliveryNote
from app.models.delivery_payment import DeliveryPayment
from app.models.deposit import Deposit
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.models.purchase_order import PurchaseOrder, StockReturn, Supplier
from app.models.slot_row import SlotRow
from app.models.slot_table import SlotTable
from app.models.telegram_group import TelegramGroup
from app.models.user import User
from app.models.withdrawal import Withdrawal

logger = logging.getLogger(__name__)


def clean_db():
    """
    Execute database wipe and clean initialization routine.
    Deletes all transaction history (orders, POs, deliveries, deposits, withdrawals, slots).
    Preserves users, products, whitelisted customers, and settings.
    """
    db = SessionLocal()
    try:
        # Section 1: Delete all transactional and operational records in FK-safe order
        db.execute(delete(DeliveryPayment))
        db.execute(delete(DeliveryNote))
        db.execute(delete(StockReturn))
        db.execute(delete(InventoryTransaction))
        db.execute(delete(Alert))
        db.execute(delete(Order))
        db.execute(delete(PurchaseOrder))
        db.execute(delete(Deposit))
        db.execute(delete(Withdrawal))
        db.execute(delete(SlotRow))
        db.execute(delete(SlotTable))
        db.execute(delete(DailyInventory))
        db.commit()

        # Clean uploaded test receipts
        for f in glob.glob("uploads/deposits/*"):
            try: os.remove(f)
            except: pass
        for f in glob.glob("uploads/withdrawals/*"):
            try: os.remove(f)
            except: pass
        if os.path.exists("persistence.pickle"):
            try: os.remove("persistence.pickle")
            except: pass

        # Section 2: Re-create clean slot tables & active date rows for both Buy Slot and Sell Slot tabs
        st_sell = SlotTable(table_name="Sell Slot Table 1", stock=Decimal("0.000"), is_active=True, display_order=1)
        st_buy = SlotTable(table_name="Buy Slot Table 1", stock=Decimal("0.000"), is_active=True, display_order=2)
        db.add_all([st_sell, st_buy])
        db.flush()

        # Section 3: Seed 14 days of future slot dates starting from today
        today = date.today()
        for offset in range(0, 14):
            d = today + timedelta(days=offset)
            db.add(SlotRow(slot_table_id=st_sell.id, slot_date=d, premium=Decimal("300.00") + Decimal(offset * 10)))
            db.add(SlotRow(slot_table_id=st_buy.id, slot_date=d, premium=Decimal("250.00") + Decimal(offset * 5)))

        # Section 4: Ensure default group entity exists if not present
        group = db.query(TelegramGroup).filter(TelegramGroup.telegram_group_id == "-1000000000001").first()
        if not group:
            db.add(TelegramGroup(telegram_group_id="-1000000000001", group_name="Telegram Bot", is_active=True))

        # Section 5: Ensure super admin user exists
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            db.add(User(
                name="Admin User",
                username="admin",
                email="admin@goldsystem.com",
                password_hash=hash_password("admin123"),
                role="SUPER_ADMIN",
                is_active=True,
            ))

        db.commit()
        print("Database wiped cleanly!")
        print("  - 0 orders")
        print("  - 0 purchase orders")
        print("  - 0 deposits / withdrawals")
        print("  - 0 inventory transactions")
        print("  - Master data (admin, products, customers, settings) preserved.")
    finally:
        db.close()


if __name__ == "__main__":
    clean_db()

