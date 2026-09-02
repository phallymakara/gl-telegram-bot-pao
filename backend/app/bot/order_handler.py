"""
Telegram bot Order History handler.
Handles rendering recent customer orders for the currently authenticated Telegram user.
"""

import asyncio
from telegram import Update
from telegram.ext import ContextTypes

from app.bot.keyboards import build_back_main_keyboard
from app.services.order_service import get_orders_by_telegram_id_sync
from app.utils.helpers import format_date_dd_mm_yy, format_premium
from app.utils.translation import t


async def handle_my_orders(update: Update, query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle the 'My Orders' button action.
    Fetches the user's recent order history by Telegram User ID and formats an order list message.
    Limits output to the latest 5 orders for message length readability.
    """
    lang = context.user_data.get("lang", "EN")
    user = update.effective_user

    # Asynchronously query order history by Telegram User ID off the main loop
    orders = await asyncio.to_thread(get_orders_by_telegram_id_sync, str(user.id))

    if not orders:
        await query.message.reply_text(
            t("no_orders", lang),
            reply_markup=build_back_main_keyboard(lang),
        )
        return

    message = t("my_orders_title", lang)

    # Format latest 5 orders with translated field headers
    for order in orders[-5:]:
        type_str = t("buy", lang) if order["order_type"] == "BUY" else t("sell", lang)
        message += (
            f"{t('order_id', lang)}: {order['order_id']}\n"
            f"{t('type', lang)}: {type_str}\n"
            f"{t('slot', lang)}: {format_date_dd_mm_yy(order['slot_date'])}\n"
            f"{t('premium', lang)}: {format_premium(order['premium'])}\n"
            f"{t('quantity', lang)}: {order['quantity_kg']} kg\n"
            f"{t('status', lang)}: {order['status']}\n"
            "──────────────\n"
        )

    await query.message.reply_text(
        message,
        reply_markup=build_back_main_keyboard(lang),
    )

