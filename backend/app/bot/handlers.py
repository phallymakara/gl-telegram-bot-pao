"""
Telegram Bot Callback Dispatcher & Main Handlers.
Includes whitelist security decorator checking, language toggling, callback routing, and command handling.
"""

from telegram import Update
from telegram.error import BadRequest
from telegram.ext import ContextTypes

from app.bot.buy_handler import handle_buy
from app.bot.keyboards import (
    LANG_MENU,
    build_main_menu,
)
from app.bot.order_flow import (
    handle_confirm_order,
    handle_quantity_selection,
    handle_slot_selection,
)
from app.bot.order_handler import handle_my_orders
from app.bot.sell_handler import handle_sell
from app.constants.callback import (
    BACK_MAIN,
    BUY,
    BUY_SLOT_PREFIX,
    CANCEL_ORDER,
    CONFIRM_ORDER,
    MY_ORDERS,
    QTY_PREFIX,
    SELL,
    SELL_SLOT_PREFIX,
)
from app.services.whitelist_service import restricted
from app.utils.translation import t


@restricted
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle Telegram /start command.
    Checks customer whitelist authorization via @restricted decorator.
    Guides user through language selection menu or active session prompt.
    """
    is_slash_start = update.message and update.message.text == "/start"

    if is_slash_start:
        # Reset session context on explicit /start command invocation
        context.user_data.clear()
        await update.message.reply_text(
            t("choose_lang", "EN"),
            reply_markup=LANG_MENU,
        )
        return

    lang = context.user_data.get("lang", "EN")
    if "selected_slot" in context.user_data:
        # Warn user if an order flow session is currently in progress
        msg = (
            "Please use the buttons provided above to complete your order, or send /start to start a new order.\n\n"
            "សូមប្រើប៊ូតុងដែលបានផ្តល់ជូនខាងលើដើម្បីបញ្ចប់ការបញ្ជាទិញរបស់អ្នក ឬផ្ញើ /start ដើម្បីចាប់ផ្តើមថ្មី។"
        )
        await update.message.reply_text(msg)
    else:
        await update.message.reply_text(
            t("choose_lang", lang),
            reply_markup=LANG_MENU,
        )


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
            t("welcome", lang),
            reply_markup=build_main_menu(lang),
        )

    elif query.data == "SWITCH_LANG":
        await query.message.reply_text(
            t("choose_lang", "EN"),
            reply_markup=LANG_MENU,
        )

    elif query.data == BUY:
        await handle_buy(query, context)

    elif query.data.startswith(BUY_SLOT_PREFIX) or query.data.startswith(SELL_SLOT_PREFIX):
        await handle_slot_selection(query, context)

    elif query.data.startswith(QTY_PREFIX):
        await handle_quantity_selection(query, context)

    elif query.data == CONFIRM_ORDER:
        await handle_confirm_order(update, query, context)

    elif query.data == CANCEL_ORDER:
        await handle_cancel_order(query, context)

    elif query.data == BACK_MAIN:
        await handle_back_main(query, context)

    elif query.data == SELL:
        await handle_sell(query, context)

    elif query.data == MY_ORDERS:
        await handle_my_orders(update, query, context)


async def handle_cancel_order(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Cancel current Telegram order flow and clear active user session state.
    """
    lang = context.user_data.get("lang", "EN")
    context.user_data.clear()
    context.user_data["lang"] = lang
    try:
        await query.edit_message_text(text=t("order_cancelled", lang))
    except BadRequest as e:
        if "Message is not modified" not in str(e):
            raise


async def handle_back_main(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Reset user flow state and return to Telegram main menu keyboard.
    """
    lang = context.user_data.get("lang", "EN")
    context.user_data.clear()
    context.user_data["lang"] = lang
    try:
        await query.edit_message_text(
            text=t("welcome", lang),
            reply_markup=build_main_menu(lang),
        )
    except BadRequest as e:
        if "Message is not modified" not in str(e):
            raise

