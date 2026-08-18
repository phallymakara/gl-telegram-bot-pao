"""
Telegram bot Sell Order flow handler.
Handles the user clicking the SELL option (customer selling gold back to store buyback slots).
"""

import asyncio
from telegram.ext import ContextTypes

from app.bot.keyboards import build_slot_keyboard
from app.services.slot_service import get_active_slots_sync
from app.utils.translation import t


async def handle_sell(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle the SELL callback query.
    Fetches active BUYBACK slot tables from database (where store buys gold from customer)
    and renders slot selection keyboard.
    """
    lang = context.user_data.get("lang", "EN")
    # Fetch active buyback slots asynchronously off the main event loop thread
    slots = await asyncio.to_thread(get_active_slots_sync, "SELL")

    await query.message.reply_text(
        t("sell_slots_title", lang),
        reply_markup=build_slot_keyboard(slots, order_type="SELL", lang=lang),
    )

