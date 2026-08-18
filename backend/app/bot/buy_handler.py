"""
Telegram bot Buy Order flow handler.
Handles the user clicking the BUY option to display available gold purchase slots.
"""

import asyncio
from telegram.ext import ContextTypes

from app.bot.keyboards import build_slot_keyboard
from app.services.slot_service import get_active_slots_sync
from app.utils.translation import t


async def handle_buy(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle the BUY callback query.
    Fetches active SELL slot tables from database (where store sells gold to customer)
    and renders slot selection keyboard.
    """
    lang = context.user_data.get("lang", "EN")
    # Fetch active slots asynchronously off the main event loop thread
    slots = await asyncio.to_thread(get_active_slots_sync, "BUY")

    await query.message.reply_text(
        t("buy_slots_title", lang),
        reply_markup=build_slot_keyboard(slots, order_type="BUY", lang=lang),
    )

