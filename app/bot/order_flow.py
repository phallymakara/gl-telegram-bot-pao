import logging
from telegram import Update
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)
from telegram.error import BadRequest

from app.bot.keyboards import (
    build_main_menu,
    build_quantity_keyboard,
    build_confirmation_keyboard,
)
from app.utils.translation import t
from app.bot.messages import (
    SESSION_EXPIRED_MESSAGE,
    SLOT_NOT_FOUND_MESSAGE,
)
from app.services.slot_service import get_slot_by_date
from app.services.order_service import place_buy_order, place_sell_order
from app.utils.helpers import format_premium, generate_invoice_text

from app.exceptions.order_exceptions import (
    SlotNotFoundError,
    InsufficientStockError
)

from app.constants.callback import (
    BUY,
    SELL,
    BUY_SLOT_PREFIX,
    SELL_SLOT_PREFIX,
    QTY_PREFIX,
)


async def handle_slot_selection(query, context: ContextTypes.DEFAULT_TYPE):
    lang = context.user_data.get("lang", "EN")
    if query.data.startswith(BUY_SLOT_PREFIX):
        order_type = BUY
        slot_date = query.data.replace(BUY_SLOT_PREFIX, "")
    else:
        order_type = SELL
        slot_date = query.data.replace(SELL_SLOT_PREFIX, "")

    context.user_data["selected_slot"] = slot_date
    context.user_data["order_type"] = order_type

    type_str = t("buy", lang) if order_type == BUY else t("sell", lang)
    msg = t("selected_slot", lang).format(type=type_str, date=slot_date)

    slot = await get_slot_by_date(slot_date, order_type)
    stock = slot.get("stock_kg", 0) if slot else 0
    logger.info("handle_slot_selection | slot_date=%s | order_type=%s | slot=%s | stock=%s", slot_date, order_type, slot, stock)

    if order_type == BUY and stock <= 0:
        await query.answer(t("slot_out_of_stock", lang), show_alert=True)
        return

    try:
        await query.edit_message_text(
            text=msg,
            reply_markup=build_quantity_keyboard(stock=stock, order_type=order_type, lang=lang),
        )
    except BadRequest as e:
        if "Message is not modified" not in str(e):
            raise


async def handle_quantity_selection(query, context: ContextTypes.DEFAULT_TYPE):
    lang = context.user_data.get("lang", "EN")
    quantity = float(query.data.replace(QTY_PREFIX, ""))

    selected_slot = context.user_data.get("selected_slot")
    order_type = context.user_data.get("order_type", BUY)

    if not selected_slot:
        await query.message.reply_text(t("session_expired", lang))
        return

    slot = await get_slot_by_date(selected_slot, order_type)

    if not slot:
        await query.message.reply_text(t("slot_not_found", lang))
        return

    context.user_data["quantity"] = quantity

    summary = (
        t("order_summary_title", lang) +
        f"{t('type', lang)}: {t('buy', lang) if order_type == BUY else t('sell', lang)}\n"
        f"{t('slot', lang)}: {selected_slot}\n"
        f"{t('premium', lang)}: {format_premium(slot['premium'])}\n"
        f"{t('quantity', lang)}: {quantity} kg\n\n"
        f"{t('confirm_prompt', lang)}"
    )

    try:
        await query.edit_message_text(
            text=summary,
            reply_markup=build_confirmation_keyboard(selected_slot, order_type, lang),
        )
    except BadRequest as e:
        if "Message is not modified" not in str(e):
            raise


async def handle_confirm_order(
    update: Update,
    query,
    context: ContextTypes.DEFAULT_TYPE,
):
    lang = context.user_data.get("lang", "EN")
    selected_slot = context.user_data.get("selected_slot")
    quantity = context.user_data.get("quantity")
    order_type = context.user_data.get("order_type", BUY)

    if not selected_slot or not quantity:
        await query.message.reply_text(t("session_expired", lang))
        return

    user = update.effective_user

    try:
        if order_type == BUY:
            order = await place_buy_order(
                telegram_id=str(user.id),
                username=user.username or user.first_name or "unknown",
                slot_date=selected_slot,
                quantity=quantity,
            )
        else:
            order = await place_sell_order(
                telegram_id=str(user.id),
                username=user.username or user.first_name or "unknown",
                slot_date=selected_slot,
                quantity=quantity,
            )

        context.user_data.clear()
        context.user_data["lang"] = lang

        # Edit the confirmation message in-place to remove the confirmation buttons and show success text
        confirmed_text = t("order_confirmed", lang).strip()
        try:
            await query.edit_message_text(text=f"{confirmed_text}\n{t('order_id', lang)}: {order.order_id}")
        except BadRequest as e:
            if "Message is not modified" not in str(e):
                raise

        success_msg = generate_invoice_text(order, user)

        await query.message.reply_text(
            success_msg,
            reply_markup=build_main_menu(lang),
            parse_mode="Markdown"
        )

    except SlotNotFoundError as error:
        await query.message.reply_text(f"❌ {error}")

    except InsufficientStockError as error:
        await query.message.reply_text(f"❌ {error}")