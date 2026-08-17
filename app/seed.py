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

from app.models.purchase_order import PurchaseOrder, Supplier

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
    {"name": "99.99% Gold Kilobar", "stock": Decimal("50.000"), "rows": [("2026-08-10", 300), ("2026-08-11", 300), ("2026-08-12", 400)]},
    {"name": "Local Gold Bar 99.99%", "stock": Decimal("51.000"), "rows": [("2026-08-10", 300), ("2026-08-11", 300), ("2026-08-12", 400)]},
    {"name": "General Gold Slot", "stock": Decimal("60.000"), "rows": [("2026-08-10", 350)]},
]

PURCHASE_ORDERS = [
    ("PO-2026-001", "OVERSEA", "Swiss Refining Corp", Decimal("1.000"), Decimal("4376.20"), Decimal("200.00"), "RECEIVED", "2026-08-15"),
    ("PO-2026-002", "LOCAL", "Phnom Penh Gold", Decimal("2.500"), Decimal("4375.00"), Decimal("150.00"), "RECEIVED", "2026-08-14"),
    ("PO-2026-004", "OVERSEA", "DB Swiss", Decimal("5.000"), Decimal("4378.00"), Decimal("250.00"), "INCOMING", "2026-08-13"),
    ("PO-2026-005", "BUYBACK", "Customer Buyback · Makara", Decimal("1.500"), Decimal("4370.00"), Decimal("100.00"), "CONFIRMED", "2026-08-12"),
    ("PO-2026-006", "LOCAL", "SV Trading", Decimal("3.000"), Decimal("4374.50"), Decimal("180.00"), "INCOMING", "2026-08-11"),
    ("PO-2026-007", "OVERSEA", "Valcambi Suisse", Decimal("10.000"), Decimal("4380.00"), Decimal("220.00"), "INCOMING", "2026-08-10"),
    ("PO-2026-008", "BUYBACK", "Customer Buyback · Sokun", Decimal("0.500"), Decimal("4368.00"), Decimal("120.00"), "RECEIVED", "2026-08-09"),
    ("PO-2026-009", "LOCAL", "Phnom Penh Refinery", Decimal("4.000"), Decimal("4372.00"), Decimal("160.00"), "RECEIVED", "2026-08-08"),
]

ORDERS = [
    # (customer_index, table_index, row_index, type, qty, status, channel, days_ago)
    (0, 0, 0, "BUY", Decimal("2.500"), "COMPLETED", "TELEGRAM", 0),
    (1, 0, 1, "SELL", Decimal("18.200"), "COMPLETED", "TELEGRAM", 0),
    (2, 1, 0, "SELL", Decimal("12.000"), "COMPLETED", "PHONE", 0),
    (3, 1, 1, "SELL", Decimal("8.500"), "COMPLETED", "WALK_IN", 0),
    (4, 2, 0, "SELL", Decimal("1.800"), "PENDING", "TELEGRAM", 1),
    (5, 0, 2, "BUY", Decimal("15.500"), "COMPLETED", "TELEGRAM", 1),
    (6, 1, 2, "SELL", Decimal("1.200"), "COMPLETED", "PHONE", 2),
    (7, 2, 0, "BUY", Decimal("4.000"), "CANCELLED", "TELEGRAM", 2),
]


def seed():
    db = SessionLocal()
    try:
        Base.metadata.drop_all(bind=engine)
        import app.db.base
        Base.metadata.create_all(bind=engine)
        db.close()
        db = SessionLocal()

        db.execute(delete(InventoryTransaction))
        db.execute(delete(Alert))
        db.execute(delete(PurchaseOrder))
        db.execute(delete(Supplier))
        db.execute(delete(Order))
        db.execute(delete(SlotRow))
        db.execute(delete(SlotTable))
        db.execute(delete(Customer))
        db.execute(delete(TelegramGroup))

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

        # Seed Purchase Orders
        for po_no, po_type, sup_name, qty, spot, prem, status, odate in PURCHASE_ORDERS:
            unit_cost = (spot * Decimal("32.148")) + prem
            total_cost = qty * unit_cost
            po = PurchaseOrder(
                po_no=po_no,
                po_type=po_type,
                supplier_name=sup_name,
                slot_table_id=slot_tables[0].id,
                quantity=qty,
                spot_price=spot,
                premium=prem,
                unit_cost=unit_cost,
                total_cost=total_cost,
                status=status,
                order_date=date.fromisoformat(odate),
                expected_date=date.fromisoformat(odate),
                received_date=date.fromisoformat(odate) if status == "RECEIVED" else None,
            )
            db.add(po)
        db.flush()

        now = datetime.utcnow()
        for i, (c_idx, t_idx, r_idx, ttype, qty, status, channel, days_ago) in enumerate(ORDERS, start=1):
            created = now - timedelta(days=days_ago, hours=random.randint(0, 8))
            premium = slot_rows[r_idx].premium
            order_no = f"GL-2026-{i:04d}"
            spot_price = Decimal("4376.20")
            unit = (spot_price * Decimal("32.148")) + premium
            tot = qty * unit
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
                channel=channel,
                customer_name=customers[c_idx].display_name,
                spot_price=spot_price,
                total_amount=tot,
                telegram_user_id=customers[c_idx].telegram_user_id,
                username=customers[c_idx].username,
                slot_date_str=slot_rows[r_idx].slot_date.isoformat(),
                created_at=created,
                updated_at=created,
            )
            db.add(o)
            db.flush()

            if ttype == "SELL" and status != "CANCELLED":
                table = slot_tables[t_idx]
                after = max(Decimal("0"), table.stock - qty)
                db.add(InventoryTransaction(
                    slot_table_id=table.id,
                    order_id=o.id,
                    transaction_type="SELL",
                    quantity=qty,
                    stock_before=table.stock,
                    stock_after=after,
                    remark=f"Auto-seeded order {order_no}",
                    created_at=created,
                ))
                table.stock = after

        db.commit()
        print("Seed complete:")
        print(f"  - {len(CUSTOMERS)} customers")
        print(f"  - {len(slot_tables)} slot tables / {len(slot_rows)} slot rows")
        print(f"  - {len(PURCHASE_ORDERS)} purchase orders")
        print(f"  - {len(ORDERS)} orders")
        print("  - admin user (username=admin, password=admin123) created")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
