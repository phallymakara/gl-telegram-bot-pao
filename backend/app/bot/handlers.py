"""
Telegram Bot Callback Dispatcher & Main Handlers.
Includes whitelist security decorator checking, language toggling, callback routing, and command handling.
"""

import asyncio
import logging
from telegram import Update
from telegram.error import BadRequest
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)

from app.bot.buy_handler import handle_buy
from app.bot.keyboards import (
    LANG_MENU,
    build_back_main_keyboard,
    build_closed_hours_keyboard,
    build_contact_sales_keyboard,
    build_main_menu,
)
from app.core.config import SALES_PHONE_DISPLAY, SALES_PHONE_NUMBER, SALES_TELEGRAM_USERNAME
from app.services.settings_service import is_within_operating_hours_sync
from app.bot.notice_service import send_off_store_notice
from app.bot.order_flow import (
    handle_confirm_order,
    handle_custom_quantity_prompt,
    handle_custom_quantity_text_input,
    handle_deposit_amount_text_input,
    handle_deposit_bank,
    handle_deposit_cheque,
    handle_deposit_cash,
    handle_deposit_doc_upload,
    handle_deposit_prompt,
    handle_numpad_back,
    handle_numpad_del,
    handle_numpad_digit,
    handle_numpad_dot,
    handle_numpad_ok,
    handle_quantity_selection,
    handle_skip_deposit_doc,
    handle_slot_selection,
    handle_withdraw_amount_text_input,
    handle_withdraw_bank,
    handle_withdraw_cheque,
    handle_withdraw_cash,
    handle_withdraw_prompt,
)
from app.bot.order_handler import (
    handle_my_orders,
    handle_transactions_menu,
    handle_transactions_by_period,
)
from app.bot.sell_handler import handle_sell
from app.constants.callback import (
    BACK_MAIN,
    BUY,
    BUY_SLOT_PREFIX,
    CANCEL_ORDER,
    CONFIRM_ORDER,
    CONTACT_SALES,
    CUSTOM_QTY,
    DEPOSIT,
    DEPOSIT_BANK,
    DEPOSIT_CHEQUE,
    DEPOSIT_CASH,
    MY_ORDERS,
    PAD_BACK,
    PAD_DEL,
    PAD_DIGIT_PREFIX,
    PAD_DOT,
    PAD_OK,
    QTY_PREFIX,
    SELL,
    SELL_SLOT_PREFIX,
    SKIP_DEPOSIT_DOC,
    WITHDRAW,
    WITHDRAW_BANK,
    WITHDRAW_CHEQUE,
    WITHDRAW_CASH,
    CALL_SALES_PHONE,
    TRANSACTIONS,
    TXN_PERIOD_3D,
    TXN_PERIOD_1W,
    TXN_PERIOD_1M,
)
from app.services.whitelist_service import restricted
from app.utils.translation import t


@restricted
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle Telegram /start command and strictly the 'Hi' keyword.
    Ignores any other message unless user is in an active input prompt.
    """
    msg_text = update.message.text.strip() if (update.message and update.message.text) else ""
    clean_text = msg_text.lower()
    words = [w for w in clean_text.split() if not w.startswith("@")]
    clean_without_mention = " ".join(words).strip()

    is_start_trigger = (
        clean_without_mention in ("hi", "សន្ទនាជាមួយបត", "សន្ទនាជាមួយ bot")
        or clean_text in ("/start", "/hi")
        or clean_text.startswith("/start@")
        or clean_text.startswith("/hi@")
    )

    if is_start_trigger:
        # Reset session context on 'សន្ទនាជាមួយបត' button click or 'hi' keyword
        context.user_data.clear()
        await update.message.reply_text(
            t("choose_lang", "EN"),
            reply_markup=LANG_MENU,
        )
        return

    # Handle deposit document/slip upload
    if context.user_data.get("awaiting_deposit_doc"):
        await handle_deposit_doc_upload(update, context)
        return

    # Handle custom quantity text input if user is entering a quantity
    if context.user_data.get("awaiting_custom_qty"):
        await handle_custom_quantity_text_input(update, context)
        return

    # Handle deposit amount text input
    if context.user_data.get("awaiting_deposit_amount"):
        await handle_deposit_amount_text_input(update, context)
        return

    # Handle withdraw amount text input
    if context.user_data.get("awaiting_withdraw_amount"):
        await handle_withdraw_amount_text_input(update, context)
        return

    # In active order session, only warn in private chat; stay silent in groups
    is_private = update.effective_chat and update.effective_chat.type == "private"
    if is_private and "selected_slot" in context.user_data:
        msg = (
            "Please use the buttons provided above to complete your order, or send /start to start a new order.\n\n"
            "សូមប្រើប៊ូតុងដែលបានផ្តល់ជូនខាងលើដើម្បីបញ្ចប់ការបញ្ជាទិញរបស់អ្នក ឬផ្ញើ /start ដើម្បីចាប់ផ្តើមថ្មី។"
        )
        await update.message.reply_text(msg)
        return

    # For any other text (other words), DO NOT respond at all
    return


async def check_trading_hours(query, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """
    Check whether automatic trading is currently allowed according to configured operating hours.
    Returns True if open, or replies with configured text/poster notice and returns False if closed.
    """
    is_open, _, _ = await asyncio.to_thread(is_within_operating_hours_sync)
    if not is_open:
        lang = context.user_data.get("lang", "EN")
        await send_off_store_notice(query.message, lang=lang, is_order_reject=False)
        return False
    return True


@restricted
async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Central router for Telegram callback queries (language selection, menu navigation, order steps).
    Protected by whitelist verification decorator.
    """
    query = update.callback_query

    # Acknowledge callback query to stop button loading spinner
    try:
        await query.answer()
    except BadRequest:
        pass

    if query.data.startswith("LANG_"):
        # Save user language preference (EN/KM/ZH)
        lang = query.data.replace("LANG_", "")
        context.user_data["lang"] = lang
        await query.message.reply_text(
            text=t("welcome", lang),
            reply_markup=build_main_menu(lang),
        )

    elif query.data == "SWITCH_LANG":
        await query.message.reply_text(
            text=t("choose_lang", "EN"),
            reply_markup=LANG_MENU,
        )

    elif query.data == BUY:
        if not await check_trading_hours(query, context):
            return
        await handle_buy(query, context)

    elif query.data.startswith(BUY_SLOT_PREFIX) or query.data.startswith(SELL_SLOT_PREFIX):
        if not await check_trading_hours(query, context):
            return
        await handle_slot_selection(query, context)

    elif query.data.startswith(QTY_PREFIX):
        await handle_quantity_selection(query, context)

    elif query.data == CUSTOM_QTY:
        await handle_custom_quantity_prompt(query, context)

    elif query.data.startswith(PAD_DIGIT_PREFIX):
        await handle_numpad_digit(query, context)

    elif query.data == PAD_DOT:
        await handle_numpad_dot(query, context)

    elif query.data == PAD_DEL:
        await handle_numpad_del(query, context)

    elif query.data == PAD_OK:
        await handle_numpad_ok(query, context)

    elif query.data == PAD_BACK:
        await handle_numpad_back(query, context)

    elif query.data == CONFIRM_ORDER:
        await handle_confirm_order(update, query, context)

    elif query.data == DEPOSIT_BANK:
        await handle_deposit_bank(update, query, context)

    elif query.data == DEPOSIT_CHEQUE:
        await handle_deposit_cheque(update, query, context)

    elif query.data == DEPOSIT_CASH:
        await handle_deposit_cash(update, query, context)

    elif query.data == WITHDRAW_BANK:
        await handle_withdraw_bank(update, query, context)

    elif query.data == WITHDRAW_CHEQUE:
        await handle_withdraw_cheque(update, query, context)

    elif query.data == WITHDRAW_CASH:
        await handle_withdraw_cash(update, query, context)

    elif query.data == SKIP_DEPOSIT_DOC:
        await handle_skip_deposit_doc(update, query, context)

    elif query.data == CANCEL_ORDER or query.data.startswith(f"{CANCEL_ORDER}:"):
        order_id = None
        if ":" in query.data:
            try:
                order_id = int(query.data.split(":", 1)[1])
            except ValueError:
                pass
        await handle_cancel_order(query, context, order_id=order_id)

    elif query.data == BACK_MAIN:
        await handle_back_main(query, context)

    elif query.data == SELL:
        if not await check_trading_hours(query, context):
            return
        await handle_sell(query, context)

    elif query.data == MY_ORDERS:
        await handle_my_orders(update, query, context)

    elif query.data == DEPOSIT:
        await handle_deposit_prompt(query, context)

    elif query.data == WITHDRAW:
        await handle_withdraw_prompt(query, context)

    elif query.data == CONTACT_SALES:
        lang = context.user_data.get("lang", "EN")
        msg = t("contact_sales_title", lang).format(
            phone=SALES_PHONE_DISPLAY,
            username=SALES_TELEGRAM_USERNAME.lstrip("@"),
        )
        await query.message.reply_text(
            text=msg,
            parse_mode="Markdown",
            reply_markup=build_contact_sales_keyboard(lang),
        )

    elif query.data == CALL_SALES_PHONE:
        lang = context.user_data.get("lang", "EN")
        await query.message.reply_contact(
            phone_number=SALES_PHONE_NUMBER,
            first_name="PHALLY MAKARA",
            last_name="(Sales Support)",
            reply_markup=build_back_main_keyboard(lang),
        )

    elif query.data == TRANSACTIONS:
        await handle_transactions_menu(update, query, context)

    elif query.data == TXN_PERIOD_3D:
        await handle_transactions_by_period(update, query, context, days=3, period_key="period_3_days")

    elif query.data == TXN_PERIOD_1W:
        await handle_transactions_by_period(update, query, context, days=7, period_key="period_1_week")

    elif query.data == TXN_PERIOD_1M:
        await handle_transactions_by_period(update, query, context, days=30, period_key="period_1_month")


async def handle_cancel_order(query, context: ContextTypes.DEFAULT_TYPE, order_id: int | None = None):
    """
    Cancel current Telegram order flow and clear active user session state.
    If an order was recently placed (or order_id provided), cancel it in the database and restore stock.
    """
    lang = context.user_data.get("lang", "EN")
    target_order_id = order_id or context.user_data.get("last_order_id")
    if target_order_id:
        try:
            from app.services.order_service import cancel_order_sync
            await asyncio.to_thread(cancel_order_sync, target_order_id)
            logger.info("Successfully cancelled order ID %s", target_order_id)
        except Exception as e:
            logger.error("Failed to cancel order %s: %s", target_order_id, e)

    context.user_data.clear()
    context.user_data["lang"] = lang
    await query.message.reply_text(
        text=f"{t('order_cancelled', lang)}\n\n{t('welcome', lang)}",
        reply_markup=build_main_menu(lang),
    )


async def handle_back_main(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Reset user flow state and return to Telegram main menu keyboard.
    """
    lang = context.user_data.get("lang", "EN")
    context.user_data.clear()
    context.user_data["lang"] = lang
    await query.message.reply_text(
        text=t("welcome", lang),
        reply_markup=build_main_menu(lang),
    )

