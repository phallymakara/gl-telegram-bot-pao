from telegram import Update
from telegram.ext import ContextTypes
from telegram.error import BadRequest

# buy handler
from app.bot.buy_handler import (
    handle_buy,
)

# order flow
from app.bot.order_flow import (
    handle_slot_selection,
    handle_quantity_selection,
    handle_confirm_order,
)

# sale handler
from app.bot.sell_handler import (
    handle_sell,
)

# order handler
from app.bot.order_handler import (
    handle_my_orders
)

from app.bot.keyboards import (
    LANG_MENU,
    build_main_menu,
    build_slot_keyboard,
    build_quantity_keyboard,
    build_confirmation_keyboard,
    build_back_main_keyboard,
)
from app.utils.translation import t
from app.services.order_service import place_buy_order, place_sell_order
from app.services.whitelist_service import restricted

from app.constants.callback import (
    BUY,
    SELL,
    MY_ORDERS,
    BACK_MAIN,
    CONFIRM_ORDER,
    CANCEL_ORDER,
    BUY_SLOT_PREFIX,
    SELL_SLOT_PREFIX,
    QTY_PREFIX,
)


@restricted
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    is_slash_start = update.message and update.message.text == "/start"
    
    if is_slash_start:
        context.user_data.clear()
        await update.message.reply_text(
            t("choose_lang", "EN"),
            reply_markup=LANG_MENU,
        )
        return

    # If it is a generic text message during an active session, guide the user
    lang = context.user_data.get("lang", "EN")
    if "selected_slot" in context.user_data:
        msg = (
            "⚠️ Please use the buttons provided above to complete your order, or send /start to start a new order.\n\n"
            "⚠️ សូមប្រើប៊ូតុងដែលបានផ្តល់ជូនខាងលើដើម្បីបញ្ចប់ការបញ្ជាទិញរបស់អ្នក ឬផ្ញើ /start ដើម្បីចាប់ផ្តើមថ្មី។"
        )
        await update.message.reply_text(msg)
    else:
        # If no active session, show the main menu or choose language
        await update.message.reply_text(
            t("choose_lang", lang),
            reply_markup=LANG_MENU,
        )


@restricted
async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query

    try:
        await query.answer()
    except BadRequest:
        pass

    if query.data.startswith("LANG_"):
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
    lang = context.user_data.get("lang", "EN")
    context.user_data.clear()
    context.user_data["lang"] = lang
    try:
        await query.edit_message_text(text=t("order_cancelled", lang))
    except BadRequest as e:
        if "Message is not modified" not in str(e):
            raise


async def handle_back_main(query, context: ContextTypes.DEFAULT_TYPE):
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
