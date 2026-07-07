from telegram.ext import ContextTypes
from app.bot.keyboards import build_slot_keyboard
from app.services.slot_service import get_active_slots
from app.utils.translation import t


async def handle_sell(query, context: ContextTypes.DEFAULT_TYPE):
    lang = context.user_data.get("lang", "EN")
    slots = await get_active_slots(order_type="SELL")

    await query.message.reply_text(
        t("sell_slots_title", lang),
        reply_markup=build_slot_keyboard(slots, order_type="SELL", lang=lang),
    )
