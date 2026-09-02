"""
Telegram bot Order Placement & Deposit Flow handlers.
Manages multi-step conversational order state (slot selection -> quantity selection -> order summary confirmation)
and interactive on-screen numpad entry for custom gold quantities and deposits.
"""

import asyncio
import logging
from telegram import Update
from telegram.error import BadRequest
from telegram.ext import ContextTypes

from app.bot.keyboards import (
    build_attach_doc_keyboard,
    build_back_main_keyboard,
    build_confirmation_keyboard,
    build_custom_qty_keyboard,
    build_deposit_confirmation_keyboard,
    build_deposit_details_keyboard,
    build_invoice_keyboard,
    build_main_menu,
    build_numpad_keyboard,
    build_quantity_keyboard,
    build_withdraw_confirmation_keyboard,
)
from app.constants.callback import (
    BUY,
    BUY_SLOT_PREFIX,
    CONFIRM_DEPOSIT,
    PAD_BACK,
    PAD_DEL,
    PAD_DIGIT_PREFIX,
    PAD_DOT,
    PAD_OK,
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
from app.utils.generators import generate_deposit_no, generate_withdraw_no
from app.utils.helpers import (
    format_date_dd_mm_yy,
    format_premium,
    generate_invoice_text,
    get_cambodia_now,
)
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
    incoming = float(slot.get("incoming_kg", 0)) if slot else 0
    stock = float(slot.get("stock_kg", 0)) if slot else 0
    total_available = incoming + stock
    logger.info("handle_slot_selection | slot_date=%s | order_type=%s | incoming=%.2f | stock=%.2f | total=%.2f", slot_date, order_type, incoming, stock, total_available)

    if order_type == BUY and total_available <= 0:
        await query.answer(t("slot_out_of_stock", lang), show_alert=True)
        return

    await query.message.reply_text(
        text=msg,
        reply_markup=build_quantity_keyboard(stock=stock, incoming_kg=incoming, order_type=order_type, lang=lang),
    )


def format_confirmation_message(selected_slot: str, order_type: str, quantity: float, slot: dict, lang: str = "EN") -> str:
    """
    Format order confirmation summary matching requested bilingual design.
    """
    type_str = t("buy", lang) if order_type == BUY else t("sell", lang)
    if quantity == int(quantity):
        qty_str = f"{quantity:.1f}"
    else:
        qty_str = f"{quantity:g}"

    premium_str = format_premium(slot.get("premium", 0))

    return (
        t("order_summary_title", lang) +
        t("type_label", lang).format(type=type_str) + "\n" +
        t("date_label", lang).format(date=format_date_dd_mm_yy(selected_slot)) + "\n" +
        t("premium_label", lang).format(premium=premium_str) + "\n" +
        t("quantity_label", lang).format(qty=qty_str) + "\n\n" +
        t("confirm_prompt", lang).format(type=type_str)
    )


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

    summary = format_confirmation_message(selected_slot, order_type, quantity, slot, lang)

    await query.message.reply_text(
        text=summary,
        reply_markup=build_confirmation_keyboard(selected_slot, order_type, lang),
    )


def get_pad_display_text(current: str, pad_mode: str, lang: str) -> str:
    """
    Format interactive numpad text based on current input mode.
    """
    if pad_mode == "DEPOSIT":
        return t("deposit_pad_prompt", lang).format(amount=current if current else "0")
    if pad_mode == "WITHDRAW":
        return t("withdraw_pad_prompt", lang).format(amount=current if current else "0")
    return t("pad_prompt", lang).format(qty=current if current else "0")


async def handle_custom_quantity_prompt(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user clicking 'Custom Input' (បញ្ចូលលេខ).
    Prompts user to type quantity on phone keyboard.
    """
    lang = context.user_data.get("lang", "EN")
    context.user_data["awaiting_custom_qty"] = True
    context.user_data.pop("pad_qty", None)
    await query.message.reply_text(
        text=t("enter_custom_qty", lang),
        reply_markup=build_custom_qty_keyboard(lang),
    )


async def handle_deposit_prompt(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user clicking 'Deposit' (ដាក់ប្រាក់).
    Prompts user to type deposit amount on phone keyboard.
    """
    lang = context.user_data.get("lang", "EN")
    context.user_data["awaiting_deposit_amount"] = True
    context.user_data.pop("pad_qty", None)
    await query.message.reply_text(
        text=t("enter_deposit_qty", lang),
        reply_markup=build_back_main_keyboard(lang),
    )


async def handle_withdraw_prompt(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user clicking 'Withdraw' (ដកប្រាក់).
    Prompts user to type withdrawal amount on phone keyboard.
    """
    lang = context.user_data.get("lang", "EN")
    context.user_data["awaiting_withdraw_amount"] = True
    context.user_data.pop("pad_qty", None)
    await query.message.reply_text(
        text=t("enter_withdraw_qty", lang),
        reply_markup=build_back_main_keyboard(lang),
    )


async def handle_numpad_digit(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user clicking a digit (0-9) on the interactive numeric keypad.
    """
    lang = context.user_data.get("lang", "EN")
    digit = query.data.replace(PAD_DIGIT_PREFIX, "")
    current = context.user_data.get("pad_qty", "")
    pad_mode = context.user_data.get("pad_mode", "QTY")

    if len(current) >= 8:
        return

    if current == "0":
        current = digit
    else:
        current += digit

    context.user_data["pad_qty"] = current
    display_text = get_pad_display_text(current, pad_mode, lang)
    try:
        await query.edit_message_text(
            text=display_text,
            reply_markup=build_numpad_keyboard(lang),
        )
    except BadRequest as e:
        if "Message is not modified" not in str(e):
            raise


async def handle_numpad_dot(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user clicking '.' (decimal dot) on the interactive numeric keypad.
    """
    lang = context.user_data.get("lang", "EN")
    current = context.user_data.get("pad_qty", "")
    pad_mode = context.user_data.get("pad_mode", "QTY")

    if "." in current:
        return

    if not current:
        current = "0."
    else:
        current += "."

    context.user_data["pad_qty"] = current
    display_text = get_pad_display_text(current, pad_mode, lang)
    try:
        await query.edit_message_text(
            text=display_text,
            reply_markup=build_numpad_keyboard(lang),
        )
    except BadRequest as e:
        if "Message is not modified" not in str(e):
            raise


async def handle_numpad_del(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user clicking 'Del' on the interactive numeric keypad.
    Deletes the last entered character.
    """
    lang = context.user_data.get("lang", "EN")
    current = context.user_data.get("pad_qty", "")
    pad_mode = context.user_data.get("pad_mode", "QTY")
    if current:
        current = current[:-1]
    context.user_data["pad_qty"] = current
    display_text = get_pad_display_text(current, pad_mode, lang)
    try:
        await query.edit_message_text(
            text=display_text,
            reply_markup=build_numpad_keyboard(lang),
        )
    except BadRequest as e:
        if "Message is not modified" not in str(e):
            raise


async def handle_numpad_ok(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user clicking 'OK' on the interactive numeric keypad.
    Validates entered number and transitions to the appropriate confirmation screen.
    """
    lang = context.user_data.get("lang", "EN")
    raw_qty = context.user_data.get("pad_qty", "").strip()
    pad_mode = context.user_data.get("pad_mode", "QTY")

    try:
        num = float(raw_qty)
        if num <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        await query.answer(t("pad_min_alert", lang), show_alert=True)
        return

    if pad_mode == "DEPOSIT":
        context.user_data["deposit_amount"] = num
        now = get_cambodia_now()
        date_str = format_date_dd_mm_yy(now)
        time_str = now.strftime("%I:%M %p")
        amount_str = f"{num:,.2f}" if (num != int(num)) else f"{int(num):,}"

        summary = (
            t("deposit_summary_title", lang) +
            t("deposit_date_label", lang).format(date=date_str, time=time_str) + "\n" +
            t("deposit_amount_label", lang).format(amount=amount_str) + "\n\n" +
            t("deposit_method_prompt", lang)
        )
        await query.message.reply_text(
            text=summary,
            reply_markup=build_deposit_confirmation_keyboard(lang),
        )
        return

    if pad_mode == "WITHDRAW":
        context.user_data["withdraw_amount"] = num
        now = get_cambodia_now()
        date_str = format_date_dd_mm_yy(now)
        time_str = now.strftime("%I:%M %p")
        amount_str = f"{num:,.2f}" if (num != int(num)) else f"{int(num):,}"

        summary = (
            t("withdraw_summary_title", lang) +
            t("withdraw_date_label", lang).format(date=date_str, time=time_str) + "\n" +
            t("withdraw_amount_label", lang).format(amount=amount_str) + "\n\n" +
            t("deposit_method_prompt", lang)
        )
        await query.message.reply_text(
            text=summary,
            reply_markup=build_withdraw_confirmation_keyboard(lang),
        )
        return

    context.user_data.pop("awaiting_custom_qty", None)
    context.user_data["quantity"] = num

    selected_slot = context.user_data.get("selected_slot")
    order_type = context.user_data.get("order_type", BUY)

    if not selected_slot:
        await query.message.reply_text(t("session_expired", lang))
        return

    slot = await asyncio.to_thread(get_slot_by_date_sync, selected_slot, order_type)
    if not slot:
        await query.message.reply_text(t("slot_not_found", lang))
        return

    summary = format_confirmation_message(selected_slot, order_type, num, slot, lang)

    await query.message.reply_text(
        text=summary,
        reply_markup=build_confirmation_keyboard(selected_slot, order_type, lang),
    )


async def handle_numpad_back(query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user clicking 'Back' from interactive keypad.
    """
    lang = context.user_data.get("lang", "EN")
    pad_mode = context.user_data.get("pad_mode", "QTY")
    context.user_data.pop("awaiting_custom_qty", None)
    context.user_data.pop("pad_qty", None)
    context.user_data.pop("pad_mode", None)

    if pad_mode in ("DEPOSIT", "WITHDRAW"):
        await query.message.reply_text(
            text=t("welcome", lang),
            reply_markup=build_main_menu(lang),
        )
        return

    selected_slot = context.user_data.get("selected_slot")
    order_type = context.user_data.get("order_type", BUY)

    if not selected_slot:
        await query.message.reply_text(t("session_expired", lang))
        return

    slot = await asyncio.to_thread(get_slot_by_date_sync, selected_slot, order_type)
    incoming = float(slot.get("incoming_kg", 0)) if slot else 0
    stock = float(slot.get("stock_kg", 0)) if slot else 0

    await query.message.reply_text(
        text=t("selected_slot", lang),
        reply_markup=build_quantity_keyboard(stock=stock, incoming_kg=incoming, order_type=order_type, lang=lang),
    )


async def handle_deposit_bank(update: Update, query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user selecting Bank Account / Cheque deposit method.
    Prompts user to attach verification documents.
    """
    lang = context.user_data.get("lang", "EN")
    context.user_data["deposit_method"] = "BANK"
    context.user_data["awaiting_deposit_doc"] = True
    context.user_data["pad_mode"] = "DEPOSIT"

    await query.message.reply_text(
        text=t("attach_doc_prompt", lang),
        reply_markup=build_attach_doc_keyboard(lang),
    )


async def handle_deposit_cash(update: Update, query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user selecting Cash deposit method.
    Prompts user to attach verification documents.
    """
    lang = context.user_data.get("lang", "EN")
    context.user_data["deposit_method"] = "CASH"
    context.user_data["awaiting_deposit_doc"] = True
    context.user_data["pad_mode"] = "DEPOSIT"

    await query.message.reply_text(
        text=t("attach_doc_prompt", lang),
        reply_markup=build_attach_doc_keyboard(lang),
    )


async def handle_withdraw_bank(update: Update, query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user selecting Bank Account / Cheque withdrawal method.
    Prompts user to attach verification documents.
    """
    lang = context.user_data.get("lang", "EN")
    context.user_data["withdraw_method"] = "BANK"
    context.user_data["awaiting_deposit_doc"] = True
    context.user_data["pad_mode"] = "WITHDRAW"

    await query.message.reply_text(
        text=t("attach_doc_prompt", lang),
        reply_markup=build_attach_doc_keyboard(lang),
    )


async def handle_withdraw_cash(update: Update, query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user selecting Cash withdrawal method.
    Prompts user to attach verification documents.
    """
    lang = context.user_data.get("lang", "EN")
    context.user_data["withdraw_method"] = "CASH"
    context.user_data["awaiting_deposit_doc"] = True
    context.user_data["pad_mode"] = "WITHDRAW"

    await query.message.reply_text(
        text=t("attach_doc_prompt", lang),
        reply_markup=build_attach_doc_keyboard(lang),
    )


async def handle_deposit_doc_upload(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user sending verification documents or photo slip for deposit/withdrawal.
    Emits formatted details confirmation matching customer image layout.
    """
    lang = context.user_data.get("lang", "EN")
    pad_mode = context.user_data.get("pad_mode", "DEPOSIT")
    amount = context.user_data.get("withdraw_amount", 0.0) if pad_mode == "WITHDRAW" else context.user_data.get("deposit_amount", 0.0)
    amount_str = f"{amount:,.2f}" if (amount != int(amount)) else f"{int(amount):,}"
    now = get_cambodia_now()
    date_str = format_date_dd_mm_yy(now)
    time_str = now.strftime("%I:%M %p")
    txn_id = generate_withdraw_no() if pad_mode == "WITHDRAW" else generate_deposit_no()

    user = update.effective_user
    full_name = user.first_name or ""
    if user.last_name:
        full_name += f" {user.last_name}"
    full_name = full_name.strip().upper() or (f"@{user.username}" if user.username else "N/A")

    context.user_data.pop("awaiting_deposit_doc", None)
    context.user_data.clear()
    context.user_data["lang"] = lang

    msg = (
        t("deposit_details_title", lang) +
        t("deposit_txn_date", lang).format(date=date_str, time=time_str) + "\n" +
        t("deposit_txn_id", lang).format(txn_id=txn_id) + "\n\n" +
        t("deposit_account_name", lang).format(name=full_name) + "\n" +
        t("deposit_amount_val", lang).format(amount=amount_str)
    )
    await update.message.reply_text(
        text=msg,
        reply_markup=build_deposit_details_keyboard(lang),
    )


async def handle_skip_deposit_doc(update: Update, query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user skipping document attachment step to submit deposit/withdrawal request directly.
    Emits formatted details confirmation matching customer image layout.
    """
    lang = context.user_data.get("lang", "EN")
    pad_mode = context.user_data.get("pad_mode", "DEPOSIT")
    amount = context.user_data.get("withdraw_amount", 0.0) if pad_mode == "WITHDRAW" else context.user_data.get("deposit_amount", 0.0)
    amount_str = f"{amount:,.2f}" if (amount != int(amount)) else f"{int(amount):,}"
    now = get_cambodia_now()
    date_str = format_date_dd_mm_yy(now)
    time_str = now.strftime("%I:%M %p")
    txn_id = generate_withdraw_no() if pad_mode == "WITHDRAW" else generate_deposit_no()

    user = update.effective_user or query.from_user
    full_name = user.first_name or ""
    if user.last_name:
        full_name += f" {user.last_name}"
    full_name = full_name.strip().upper() or (f"@{user.username}" if user.username else "N/A")

    context.user_data.pop("awaiting_deposit_doc", None)
    context.user_data.clear()
    context.user_data["lang"] = lang

    msg = (
        t("deposit_details_title", lang) +
        t("deposit_txn_date", lang).format(date=date_str, time=time_str) + "\n" +
        t("deposit_txn_id", lang).format(txn_id=txn_id) + "\n\n" +
        t("deposit_account_name", lang).format(name=full_name) + "\n" +
        t("deposit_amount_val", lang).format(amount=amount_str)
    )
    await query.message.reply_text(
        text=msg,
        reply_markup=build_deposit_details_keyboard(lang),
    )


async def handle_custom_quantity_text_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user typing custom numeric quantity text message in chat.
    Validates number and proceeds to order confirmation step.
    """
    lang = context.user_data.get("lang", "EN")
    text = (update.message.text or "").strip()

    try:
        quantity = float(text)
        if quantity <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        await update.message.reply_text(t("invalid_qty", lang))
        return

    context.user_data.pop("awaiting_custom_qty", None)
    context.user_data.pop("pad_qty", None)
    selected_slot = context.user_data.get("selected_slot")
    order_type = context.user_data.get("order_type", BUY)

    if not selected_slot:
        await update.message.reply_text(t("session_expired", lang))
        return

    slot = await asyncio.to_thread(get_slot_by_date_sync, selected_slot, order_type)
    if not slot:
        await update.message.reply_text(t("slot_not_found", lang))
        return

    context.user_data["quantity"] = quantity

    # Format order review summary
    summary = format_confirmation_message(selected_slot, order_type, quantity, slot, lang)

    await update.message.reply_text(
        text=summary,
        reply_markup=build_confirmation_keyboard(selected_slot, order_type, lang),
    )


async def handle_deposit_amount_text_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user typing deposit dollar amount on phone keyboard.
    Validates number and proceeds to deposit summary screen.
    """
    lang = context.user_data.get("lang", "EN")
    text = (update.message.text or "").strip()

    try:
        amount = float(text)
        if amount <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        await update.message.reply_text(t("invalid_amount", lang))
        return

    context.user_data.pop("awaiting_deposit_amount", None)
    context.user_data["deposit_amount"] = amount
    now = get_cambodia_now()
    date_str = format_date_dd_mm_yy(now)
    time_str = now.strftime("%I:%M %p")
    amount_str = f"{amount:,.2f}" if (amount != int(amount)) else f"{int(amount):,}"

    summary = (
        t("deposit_summary_title", lang) +
        t("deposit_date_label", lang).format(date=date_str, time=time_str) + "\n" +
        t("deposit_amount_label", lang).format(amount=amount_str) + "\n\n" +
        t("deposit_method_prompt", lang)
    )
    await update.message.reply_text(
        text=summary,
        reply_markup=build_deposit_confirmation_keyboard(lang),
    )


async def handle_withdraw_amount_text_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle user typing withdrawal dollar amount on phone keyboard.
    Validates number and proceeds to withdrawal summary screen.
    """
    lang = context.user_data.get("lang", "EN")
    text = (update.message.text or "").strip()

    try:
        amount = float(text)
        if amount <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        await update.message.reply_text(t("invalid_amount", lang))
        return

    context.user_data.pop("awaiting_withdraw_amount", None)
    context.user_data["withdraw_amount"] = amount
    now = get_cambodia_now()
    date_str = format_date_dd_mm_yy(now)
    time_str = now.strftime("%I:%M %p")
    amount_str = f"{amount:,.2f}" if (amount != int(amount)) else f"{int(amount):,}"

    summary = (
        t("withdraw_summary_title", lang) +
        t("withdraw_date_label", lang).format(date=date_str, time=time_str) + "\n" +
        t("withdraw_amount_label", lang).format(amount=amount_str) + "\n\n" +
        t("deposit_method_prompt", lang)
    )
    await update.message.reply_text(
        text=summary,
        reply_markup=build_withdraw_confirmation_keyboard(lang),
    )


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

        # Generate formatted purchase receipt text
        receipt_msg = generate_invoice_text(order, user, lang)
        await query.message.reply_text(
            text=receipt_msg,
            reply_markup=build_invoice_keyboard(lang),
        )

    except SlotNotFoundError as error:
        await query.message.reply_text(str(error))
    except InsufficientStockError as error:
        await query.message.reply_text(str(error))
