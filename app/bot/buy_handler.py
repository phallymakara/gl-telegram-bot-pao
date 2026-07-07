import asyncio
from telegram.ext import ContextTypes
from app.utils.translation import t
from app.bot.keyboards import build_slot_keyboard
from app.services.slot_service import get_active_slots_sync


async def handle_buy(query, context: ContextTypes.DEFAULT_TYPE):
    lang = context.user_data.get("lang", "EN")
    slots = await asyncio.to_thread(get_active_slots_sync, "BUY")

    await query.message.reply_text(
        t("buy_slots_title", lang),
        reply_markup=build_slot_keyboard(slots, order_type="BUY", lang=lang),
    )
