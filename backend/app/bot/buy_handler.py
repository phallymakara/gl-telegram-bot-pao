import asyncio
from telegram.error import BadRequest
from telegram.ext import ContextTypes

from app.bot.keyboards import build_slot_keyboard, get_slots_title
from app.services.slot_service import get_active_slots_sync


async def handle_buy(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle the BUY callback query.
    Fetches active SELL slot tables from database (where store sells gold to customer)
    and renders slot selection keyboard.
    """
    lang = context.user_data.get("lang", "EN")
    # Fetch active slots asynchronously off the main event loop thread
    slots = await asyncio.to_thread(get_active_slots_sync, "BUY")

    title = get_slots_title(slots, lang=lang)
    await query.message.reply_text(
        title,
        reply_markup=build_slot_keyboard(slots, order_type="BUY", lang=lang),
    )

