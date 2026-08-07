import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, func

from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.alert import Alert
from app.models.customer import Customer
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.models.slot_row import SlotRow
from app.models.slot_table import SlotTable
from app.models.telegram_group import TelegramGroup
from app.models.user import User

CUSTOMERS = [
    ("123456001", "makara", "Makara", "Phally", "Makara Phally"),
    ("123456002", "sokun", "Sokun", "Nisa", "Sokun Nisa"),
    ("123456003", "vutha", "Vutha", "Kim", "Vutha Kim"),
    ("123456004", "leang", "Leang", "Dara", "Leang Dara"),
    ("123456005", "bunthy", "Bunthy", "Chhay", "Bunthy Chhay"),
    ("123456006", "pich", "Pich", "Samnang", "Pich Samnang"),
    ("123456007", "sreyleak", "Sreyleak", "Touch", "Sreyleak Touch"),
    ("123456008", "davy", "Davy", "Hour", "Davy Hour"),
]

SLOT_TABLES = [
    {"name": "Table 1", "stock": Decimal("50.000"), "rows": [("2026-08-10", 300), ("2026-08-11", 300), ("2026-08-12", 400)]},
    {"name": "Table 2", "stock": Decimal("51.000"), "rows": [("2026-08-10", 300), ("2026-08-11", 300), ("2026-08-12", 400)]},
    {"name": "Table 3", "stock": Decimal("60.000"), "rows": [("2026-08-10", 350)]},
]

ORDERS = [
    # (customer_index, table_index, row_index, type, qty, status, days_ago)
    (0, 0, 0, "BUY", Decimal("2.500"), "COMPLETED", 0),
    (1, 0, 1, "SELL", Decimal("1.200"), "COMPLETED", 0),
    (2, 1, 0, "BUY", Decimal("3.000"), "COMPLETED", 1),
    (3, 1, 1, "BUY", Decimal("0.800"), "COMPLETED", 1),
    (4, 2, 0, "SELL", Decimal("1.800"), "PENDING", 1),
    (5, 0, 2, "BUY", Decimal("2.000"), "COMPLETED", 2),
    (6, 1, 2, "SELL", Decimal("1.200"), "COMPLETED", 2),
    (7, 2, 0, "BUY", Decimal("4.000"), "CANCELLED", 2),
    (0, 1, 0, "BUY", Decimal("1.500"), "COMPLETED", 3),
    (2, 0, 1, "SELL", Decimal("0.600"), "COMPLETED", 3),
    (3, 2, 0, "BUY", Decimal("2.200"), "COMPLETED", 3),
    (5, 1, 1, "SELL", Decimal("3.000"), "COMPLETED", 4),
    (6, 0, 0, "BUY", Decimal("1.000"), "COMPLETED", 4),
    (1, 2, 0, "BUY", Decimal("2.800"), "COMPLETED", 4),
    (4, 1, 2, "SELL", Decimal("1.400"), "PENDING", 5),
    (7, 0, 2, "BUY", Decimal("0.900"), "COMPLETED", 5),
    (0, 2, 0, "SELL", Decimal("2.000"), "COMPLETED", 5),
    (3, 1, 0, "BUY", Decimal("1.700"), "COMPLETED", 6),
    (6, 2, 0, "SELL", Decimal("0.500"), "COMPLETED", 6),
    (2, 0, 1, "BUY", Decimal("3.500"), "COMPLETED", 6),
]


def seed():
    db = SessionLocal()
    try:
        Base.metadata.drop_all(bind=engine)
        import app.db.base
        Base.metadata.create_all(bind=engine)
        db.close()
        db = SessionLocal()
        existing_orders = db.query(func.count(Order.id)).scalar()
        if existing_orders:
            db.execute(delete(InventoryTransaction))
            db.execute(delete(Alert))
            db.execute(delete(Order))
            db.execute(delete(SlotRow))
            db.execute(delete(SlotTable))
            db.execute(delete(Customer))
            db.execute(delete(TelegramGroup))
            print(f"Cleared {existing_orders} existing orders and related data.")

        if not db.query(User).filter(User.username == "admin").first():
            db.add(User(
                name="Admin User",
                username="admin",
                email="admin@goldsystem.com",
                password_hash=hash_password("admin123"),
                role="SUPER_ADMIN",
                is_active=True,
            ))

        group = TelegramGroup(telegram_group_id="-1000000000001", group_name="Telegram Bot", is_active=True)
        db.add(group)
        db.flush()

        customers = []
        for tg_id, username, first, last, display in CUSTOMERS:
            c = Customer(
                telegram_user_id=tg_id,
                username=username,
                first_name=first,
                last_name=last,
                display_name=display,
            )
            db.add(c)
            customers.append(c)
        db.flush()

        slot_tables = []
        slot_rows = []
        for order, spec in enumerate(SLOT_TABLES, start=1):
            st = SlotTable(
                table_name=spec["name"],
                stock=spec["stock"],
                is_active=True,
                display_order=order,
            )
            db.add(st)
            db.flush()
            slot_tables.append(st)
            for date_str, premium in spec["rows"]:
                sr = SlotRow(
                    slot_table_id=st.id,
                    slot_date=date.fromisoformat(date_str),
                    premium=Decimal(premium),
                )
                db.add(sr)
                slot_rows.append(sr)
        db.flush()

        now = datetime.utcnow()
        for i, (c_idx, t_idx, r_idx, ttype, qty, status, days_ago) in enumerate(ORDERS, start=1):
            created = now - timedelta(days=days_ago, hours=random.randint(0, 8))
            premium = slot_rows[r_idx].premium
            order_no = f"GL-2026-{i:04d}"
            o = Order(
                order_no=order_no,
                customer_id=customers[c_idx].id,
                group_id=group.id,
                slot_id=slot_rows[r_idx].id,
                quantity=qty,
                premium=premium,
                premium_amount=(qty * premium).quantize(Decimal("0.01")),
                transaction_type=ttype,
                status=status,
                telegram_user_id=customers[c_idx].telegram_user_id,
                username=customers[c_idx].username,
                slot_date_str=slot_rows[r_idx].slot_date.isoformat(),
                created_at=created,
                updated_at=created,
            )
            db.add(o)
            db.flush()

            if ttype == "BUY" and status != "CANCELLED":
                table = slot_tables[t_idx]
                after = max(Decimal("0"), table.stock - qty)
                db.add(InventoryTransaction(
                    slot_table_id=table.id,
                    order_id=o.id,
                    transaction_type="SELL",
                    quantity=qty,
                    stock_before=table.stock,
                    stock_after=after,
                    remark=f"Auto-seeded from order {order_no}",
                    created_at=created,
                ))
                table.stock = after

        db.commit()
        print("Seed complete:")
        print(f"  - {len(CUSTOMERS)} customers")
        print(f"  - {len(slot_tables)} slot tables / {len(slot_rows)} slot rows")
        print(f"  - {len(ORDERS)} orders")
        print("  - admin user (username=admin, password=admin123) created if missing")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
