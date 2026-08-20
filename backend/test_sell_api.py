import app.db.base
import urllib.request
import json
from app.core.database import SessionLocal
from app.models.slot_table import SlotTable

API = "http://localhost:8000/api"

# Stock BEFORE
session = SessionLocal()
sell_before = float(session.query(SlotTable).filter(SlotTable.table_name.ilike("%SELL%")).first().stock)
buy_before = float(session.query(SlotTable).filter(SlotTable.table_name.ilike("%BUY%")).first().stock)
session.close()
print("=== BEFORE SELL ORDER ===")
print(f"SELL vault: {sell_before} kg | BUY vault: {buy_before} kg | Total: {sell_before + buy_before} kg")

# Create SELL order via API (store sells 5kg gold to customer)
print("\n=== CREATING SELL ORDER: 5kg to Test Customer ===")
data = json.dumps({
    "transaction_type": "SELL",
    "quantity": 5,
    "premium": 10,
    "customer_name": "Test Customer",
    "sales_person": "Pao Sale",
    "channel": "WALK_IN",
    "region": "LOCAL",
    "status": "CONFIRMED",
    "slot_date_str": "2026-08-19",
}).encode("utf-8")
req = urllib.request.Request(f"{API}/orders/", data=data, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
order = json.loads(resp.read())
print(f"Order: {order['order_no']} | {order['quantity']}kg | {order['transaction_type']} | {order['status']}")

# Stock AFTER
session2 = SessionLocal()
sell_after = float(session2.query(SlotTable).filter(SlotTable.table_name.ilike("%SELL%")).first().stock)
buy_after = float(session2.query(SlotTable).filter(SlotTable.table_name.ilike("%BUY%")).first().stock)
session2.close()
print(f"\n=== AFTER SELL ORDER ===")
print(f"SELL vault: {sell_after} kg | BUY vault: {buy_after} kg | Total: {sell_after + buy_after} kg")
print(f"SELL diff: {sell_before} -> {sell_after} = {sell_before - sell_after} kg")

# Order history
print("\n=== ORDER HISTORY ===")
resp2 = urllib.request.urlopen(f"{API}/orders/")
orders = json.loads(resp2.read())
for o in orders:
    print(f"  {o['order_no']} | {o['transaction_type']} | {o['quantity']}kg | {o['status']} | {o['customer_name']}")
