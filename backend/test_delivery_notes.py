"""
Automated Test Verification for Delivery Notes and Payment Collections System.
Tests Partial Gold Deliveries (Multi-DO per sale) and Partial Payment Collections.
"""

from decimal import Decimal
from datetime import date
from uuid import uuid4
from fastapi import HTTPException
import app.db.base  # Register all ORM models
from app.core.database import SessionLocal, engine, Base
from app.models.order import Order
from app.models.customer import Customer
from app.models.delivery_note import DeliveryNote
from app.models.delivery_payment import DeliveryPayment
from app.services.delivery_service import (
    create_delivery_note_sync,
    record_payment_collection_sync,
    get_eligible_sales_orders,
)
from app.schemas.delivery_note import (
    DeliveryNoteCreate,
    DeliveryPaymentCreate,
)


def run_tests():
    db = SessionLocal()
    try:
        print("=== Step 0: Ensure DB tables exist ===")
        Base.metadata.create_all(bind=engine)

        uid = uuid4().hex[:6].upper()

        print("\n=== Step 1: Create test customer and test orders ===")
        # Create customer
        cust = db.query(Customer).filter(Customer.username == f"test_cust_{uid}").first()
        if not cust:
            cust = Customer(username=f"test_cust_{uid}", display_name="Golden King Co.")
            db.add(cust)
            db.commit()
            db.refresh(cust)

        # 1. Non-completed SELL order
        order_pending = Order(
            order_no=f"TEST-SELL-PENDING-{uid}",
            customer_id=cust.id,
            customer_name=cust.display_name,
            quantity=Decimal("2.500"),
            premium=Decimal("10.00"),
            premium_amount=Decimal("25.00"),
            transaction_type="SELL",
            status="CONFIRMED", # Not completed/delivered
            total_amount=Decimal("5000.00"),
        )
        db.add(order_pending)

        # 2. Completed BUY order
        order_buy = Order(
            order_no=f"TEST-BUY-COMPLETED-{uid}",
            customer_id=cust.id,
            customer_name=cust.display_name,
            quantity=Decimal("1.000"),
            premium=Decimal("5.00"),
            premium_amount=Decimal("5.00"),
            transaction_type="BUY",
            status="COMPLETED",
            total_amount=Decimal("2000.00"),
        )
        db.add(order_buy)

        # 3. Completed SELL order (total 3.000 KG @ $6000.00)
        order_valid = Order(
            order_no=f"TEST-SELL-COMPLETED-{uid}",
            customer_id=cust.id,
            customer_name=cust.display_name,
            quantity=Decimal("3.000"),
            premium=Decimal("15.00"),
            premium_amount=Decimal("45.00"),
            transaction_type="SELL",
            status="COMPLETED",
            total_amount=Decimal("6000.00"),
        )
        db.add(order_valid)

        db.commit()
        db.refresh(order_pending)
        db.refresh(order_buy)
        db.refresh(order_valid)

        print("\n=== Test Rule 1: Cannot create Delivery Note for non-completed or BUY order ===")
        try:
            create_delivery_note_sync(
                db,
                DeliveryNoteCreate(
                    order_id=order_pending.id,
                    recipient_name="Golden King Recipient",
                    delivery_address="123 Gold Blvd, Phnom Penh",
                )
            )
            assert False, "Expected error creating delivery note for pending order"
        except HTTPException as e:
            print("  [PASSED] Correctly rejected pending order:", e.detail)

        try:
            create_delivery_note_sync(
                db,
                DeliveryNoteCreate(
                    order_id=order_buy.id,
                    recipient_name="Golden King Recipient",
                    delivery_address="123 Gold Blvd, Phnom Penh",
                )
            )
            assert False, "Expected error creating delivery note for BUY order"
        except HTTPException as e:
            print("  [PASSED] Correctly rejected BUY order:", e.detail)

        print("\n=== Test Partial Gold Delivery: Create DO #1 for 1.000 KG (out of 3.000 KG) ===")
        dn1 = create_delivery_note_sync(
            db,
            DeliveryNoteCreate(
                order_id=order_valid.id,
                recipient_name="Golden King Branch 1",
                delivery_address="123 Gold Blvd, Phnom Penh",
                gold_quantity=Decimal("1.000"),
                driver_contact="+855 12 999 888",
            )
        )
        print(f"  [PASSED] Created DO #1: {dn1.delivery_no}")
        print(f"  Dispatched: {dn1.gold_quantity} KG (Proportional Owed: ${dn1.amount_owed})")
        assert dn1.gold_quantity == Decimal("1.000")
        assert dn1.amount_owed == Decimal("2000.00") # 1/3 of 6000.00
        assert dn1.outstanding_balance == Decimal("2000.00")
        assert dn1.payment_status == "WAITING_PAYMENT"

        print("\n=== Test Eligible Orders Tracker: Verify remaining gold to deliver ===")
        eligible = get_eligible_sales_orders(db)
        ord_info = next((item for item in eligible if item["order"].id == order_valid.id), None)
        assert ord_info is not None
        print(f"  [PASSED] Remaining gold for order {order_valid.order_no}: {ord_info['remaining_quantity']} KG (Dispatched: {ord_info['dispatched_quantity']} KG)")
        assert ord_info["remaining_quantity"] == Decimal("2.000")
        assert ord_info["dispatched_quantity"] == Decimal("1.000")

        print("\n=== Test Rule 2 (Limit): Attempt to dispatch 2.500 KG (exceeds 2.000 KG remaining) ===")
        try:
            create_delivery_note_sync(
                db,
                DeliveryNoteCreate(
                    order_id=order_valid.id,
                    recipient_name="Golden King Branch 2",
                    delivery_address="456 Silver Ave",
                    gold_quantity=Decimal("2.500"),
                )
            )
            assert False, "Expected error when dispatching more gold than remaining"
        except HTTPException as e:
            print("  [PASSED] Correctly prevented over-dispatching gold:", e.detail)

        print("\n=== Test Partial Gold Delivery: Create DO #2 for remaining 2.000 KG ===")
        dn2 = create_delivery_note_sync(
            db,
            DeliveryNoteCreate(
                order_id=order_valid.id,
                recipient_name="Golden King Branch 2",
                delivery_address="456 Silver Ave, Phnom Penh",
                gold_quantity=Decimal("2.000"),
            )
        )
        print(f"  [PASSED] Created DO #2: {dn2.delivery_no}")
        print(f"  Dispatched: {dn2.gold_quantity} KG (Proportional Owed: ${dn2.amount_owed})")
        assert dn2.gold_quantity == Decimal("2.000")
        assert dn2.amount_owed == Decimal("4000.00") # 2/3 of 6000.00
        assert dn2.outstanding_balance == Decimal("4000.00")

        print("\n=== Test Fully Delivered Order: Attempt to create DO #3 when 0 KG remains ===")
        try:
            create_delivery_note_sync(
                db,
                DeliveryNoteCreate(
                    order_id=order_valid.id,
                    recipient_name="Golden King Branch 3",
                    delivery_address="789 Bronze Rd",
                    gold_quantity=Decimal("0.500"),
                )
            )
            assert False, "Expected error when creating DO for fully delivered order"
        except HTTPException as e:
            print("  [PASSED] Correctly rejected DO creation for fully delivered order:", e.detail)

        print("\n=== Test Partial Payments on DO #1 ($2000 owed) ===")
        # Pay $1200 partial
        dn1, p1 = record_payment_collection_sync(
            db,
            dn1.id,
            DeliveryPaymentCreate(
                amount=Decimal("1200.00"),
                payment_date=date.today(),
                collected_by="Staff Alice",
                payment_method="CASH",
            )
        )
        print(f"  [PASSED] Recorded Payment $1200 on DO #1 -> Paid: ${dn1.amount_paid}, Outstanding: ${dn1.outstanding_balance}, Status: {dn1.payment_status}")
        assert dn1.amount_paid == Decimal("1200.00")
        assert dn1.outstanding_balance == Decimal("800.00")
        assert dn1.payment_status == "PARTIALLY_PAID"

        # Pay remaining $800
        dn1, p2 = record_payment_collection_sync(
            db,
            dn1.id,
            DeliveryPaymentCreate(
                amount=Decimal("800.00"),
                payment_date=date.today(),
                collected_by="Staff Alice",
                payment_method="BANK_TRANSFER",
            )
        )
        print(f"  [PASSED] Recorded Payment $800 on DO #1 -> Paid: ${dn1.amount_paid}, Outstanding: ${dn1.outstanding_balance}, Status: {dn1.payment_status}")
        assert dn1.amount_paid == Decimal("2000.00")
        assert dn1.outstanding_balance == Decimal("0.00")
        assert dn1.payment_status == "PAID"

        print("\n=== Clean up test data ===")
        db.delete(p1)
        db.delete(p2)
        db.delete(dn1)
        db.delete(dn2)
        db.delete(order_pending)
        db.delete(order_buy)
        db.delete(order_valid)
        db.delete(cust)
        db.commit()
        print("  Test data cleaned up successfully.")

        print("\n>>> ALL PARTIAL GOLD DELIVERIES & PARTIAL PAYMENTS TESTED 100% SUCCESSFULLY! <<<")

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
