import asyncio
from telegram.error import BadRequest
from telegram.ext import ContextTypes

from app.bot.keyboards import build_slot_keyboard, get_slots_title
from app.services.slot_service import get_active_slots_sync


async def handle_sell(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle the SELL callback query.
    Fetches active BUYBACK slot tables from database (where store buys gold from customer)
    and renders slot selection keyboard.
    """
    lang = context.user_data.get("lang", "EN")
    # Fetch active buyback slots asynchronously off the main event loop thread
    slots = await asyncio.to_thread(get_active_slots_sync, "SELL")

    title = get_slots_title(slots, lang=lang)
    await query.message.reply_text(
        title,
        reply_markup=build_slot_keyboard(slots, order_type="SELL", lang=lang),
    )

