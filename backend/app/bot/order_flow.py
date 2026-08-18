"""
Telegram bot Order Placement Flow handlers.
Manages multi-step conversational order state (slot selection -> quantity selection -> order summary confirmation).
"""

import asyncio
import logging
from telegram import Update
from telegram.error import BadRequest
from telegram.ext import ContextTypes

from app.bot.keyboards import (
    build_confirmation_keyboard,
    build_main_menu,
    build_quantity_keyboard,
)
from app.constants.callback import (
    BUY,
    BUY_SLOT_PREFIX,
    QTY_PREFIX,
    SELL,
    SELL_SLOT_PREFIX,
)
from app.exceptions.order_exceptions import (
    InsufficientStockError,
    SlotNotFoundError,
)
from app.services.order_service import place_buy_order, place_sell_order
from app.services.slot_service import get_slot_by_date_sync
from app.utils.helpers import format_premium, generate_invoice_text
from app.utils.translation import t

logger = logging.getLogger(__name__)


async def handle_slot_selection(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user selecting a specific slot date.
    Stores selected slot date and order type in user_data session state and presents quantity selection options.
    """
    lang = context.user_data.get("lang", "EN")
    if query.data.startswith(BUY_SLOT_PREFIX):
        order_type = BUY
        slot_date = query.data.replace(BUY_SLOT_PREFIX, "")
    else:
        order_type = SELL
        slot_date = query.data.replace(SELL_SLOT_PREFIX, "")

    # Save selection to user session state
    context.user_data["selected_slot"] = slot_date
    context.user_data["order_type"] = order_type

    type_str = t("buy", lang) if order_type == BUY else t("sell", lang)
    msg = t("selected_slot", lang).format(type=type_str, date=slot_date)

    # Check slot details and available inventory stock
    slot = await asyncio.to_thread(get_slot_by_date_sync, slot_date, order_type)
    stock = float(slot.get("stock_kg", 0)) if slot else 0
    logger.info("handle_slot_selection | slot_date=%s | order_type=%s | stock=%.2f", slot_date, order_type, stock)

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
    """
    Handle user selecting order quantity in Kilograms (1kg - 5kg).
    Validates active session state and renders order summary confirmation review keyboard.
    """
    lang = context.user_data.get("lang", "EN")
    quantity = float(query.data.replace(QTY_PREFIX, ""))

    selected_slot = context.user_data.get("selected_slot")
    order_type = context.user_data.get("order_type", BUY)

    # Validate active session state
    if not selected_slot:
        await query.message.reply_text(t("session_expired", lang))
        return

    slot = await asyncio.to_thread(get_slot_by_date_sync, selected_slot, order_type)
    if not slot:
        await query.message.reply_text(t("slot_not_found", lang))
        return

    context.user_data["quantity"] = quantity

    # Format order review summary
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
    """
    Finalize and place customer order upon user clicking Confirm.
    Persists order to database, deducts physical stock inventory, and emits a structured invoice.
    """
    lang = context.user_data.get("lang", "EN")
    selected_slot = context.user_data.get("selected_slot")
    quantity = context.user_data.get("quantity")
    order_type = context.user_data.get("order_type", BUY)

    if not selected_slot or not quantity:
        await query.message.reply_text(t("session_expired", lang))
        return

    user = update.effective_user

    try:
        # Dispatch order placement logic to order_service
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

        # Reset session flow state upon successful placement
        context.user_data.clear()
        context.user_data["lang"] = lang

        confirmed_text = t("order_confirmed", lang).strip()
        try:
            await query.edit_message_text(text=f"{confirmed_text}\n{t('order_id', lang)}: {order.order_no}")
        except BadRequest as e:
            if "Message is not modified" not in str(e):
                raise

        # Generate and send formatted purchase invoice text
        success_msg = generate_invoice_text(order, user)
        await query.message.reply_text(
            success_msg,
            reply_markup=build_main_menu(lang),
        )

    except SlotNotFoundError as error:
        await query.message.reply_text(str(error))
    except InsufficientStockError as error:
        await query.message.reply_text(str(error))


