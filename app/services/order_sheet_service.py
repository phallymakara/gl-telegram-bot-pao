import asyncio
from datetime import datetime
import requests

from app.services.google_client import orders_sheet, sell_orders_sheet
from app.models.order import Order


async def create_order(order: Order):
    sheet = sell_orders_sheet if order.order_type == "SELL" else orders_sheet
    await asyncio.to_thread(
        sheet.append_row,
        [
            order.order_id,
            order.telegram_id,
            order.username,
            order.order_type,
            order.slot_date,
            order.premium,
            order.quantity_kg,
            order.status,
            datetime.now().isoformat(),
        ],
        value_input_option="USER_ENTERED",
        insert_data_option="INSERT_ROWS",
    )


async def get_orders_by_telegram_id(telegram_id: str):
    try:
        buy_rows = await asyncio.to_thread(orders_sheet.get_all_records)
        sell_rows = await asyncio.to_thread(sell_orders_sheet.get_all_records)

        user_buy_orders = [
            row for row in buy_rows
            if str(row.get("telegram_id")) == str(telegram_id)
        ]
        user_sell_orders = [
            row for row in sell_rows
            if str(row.get("telegram_id")) == str(telegram_id)
        ]

        all_orders = user_buy_orders + user_sell_orders
        all_orders.sort(key=lambda x: str(x.get("created_at", "")))
        return all_orders

    except requests.exceptions.RequestException:
        return []                                             