from telegram import Update
from telegram.ext import ContextTypes

from app.bot.keyboards import build_back_main_keyboard
from app.services.order_sheet_service import get_orders_by_telegram_id
from app.utils.helpers import format_premium
from app.utils.translation import t


async def handle_my_orders(update: Update, query, context: ContextTypes.DEFAULT_TYPE):
    lang = context.user_data.get("lang", "EN")
    user = update.effective_user

    orders = await get_orders_by_telegram_id(str(user.id))

    if not orders:
        await query.message.reply_text(
            t("no_orders", lang),
            reply_markup=build_back_main_keyboard(lang),
        )
        return

    message = t("my_orders_title", lang)

    for order in orders[-5:]:
        type_str = t("buy", lang) if order['order_type'] == 'BUY' else t("sell", lang)
        message += (
            f"{t('order_id', lang)}: {order['order_id']}\n"
            f"{t('type', lang)}: {type_str}\n"
            f"{t('slot', lang)}: {order['slot_date']}\n"
            f"{t('premium', lang)}: {format_premium(order['premium'])}\n"
            f"{t('quantity', lang)}: {order['quantity_kg']} kg\n"
            f"{t('status', lang)}: {order['status']}\n"
            "──────────────\n"
        )

    await query.message.reply_text(
        message,
        reply_markup=build_back_main_keyboard(lang),
    )