"""
Telegram bot Order History handler.
Handles rendering recent customer orders for the currently authenticated Telegram user.
"""

import asyncio
from datetime import datetime
from telegram import Update
from telegram.ext import ContextTypes

from app.bot.keyboards import (
    build_back_main_keyboard,
    build_transaction_periods_keyboard,
    build_transaction_result_keyboard,
)
from app.services.order_service import (
    get_orders_by_period_sync,
    get_orders_by_telegram_id_sync,
)
from app.utils.helpers import format_date_dd_mm_yy, format_premium
from app.utils.translation import t



async def handle_my_orders(update: Update, query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle the 'My Orders' button action.
    Fetches the user's recent order history by Telegram User ID and formats an order list message.
    Limits output to the latest 5 orders for message length readability.
    """
    lang = context.user_data.get("lang", "EN")
    user = update.effective_user

    # Asynchronously query order history by Telegram User ID off the main loop
    orders = await asyncio.to_thread(get_orders_by_telegram_id_sync, str(user.id))

    if not orders:
        await query.message.reply_text(
            t("no_orders", lang),
            reply_markup=build_back_main_keyboard(lang),
        )
        return

    message = t("my_orders_title", lang)

    # Format latest 5 orders with translated field headers
    for order in orders[:5]:
        type_str = t("buy", lang) if order["order_type"] == "BUY" else t("sell", lang)
        message += (
            f"{t('order_id', lang)}: {order['order_id']}\n"
            f"{t('type', lang)}: {type_str}\n"
            f"{t('slot', lang)}: {format_date_dd_mm_yy(order['slot_date'])}\n"
            f"{t('premium', lang)}: {format_premium(order['premium'])}\n"
            f"{t('quantity', lang)}: {order['quantity_kg']} kg\n"
            f"{t('status', lang)}: {order['status']}\n"
            "──────────────\n"
        )

    await query.message.reply_text(
        message,
        reply_markup=build_back_main_keyboard(lang),
    )


async def handle_transactions_menu(update: Update, query, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle the 'ប្រតិបត្តិការ 📋 / Transactions' button action.
    Presents the user with the 3 time period options:
    - 3 Days (៣ ថ្ងៃចុងក្រោយ)
    - 1 Week (១ សប្តាហ៍ចុងក្រោយ)
    - 1 Month (១ ខែចុងក្រោយ)
    """
    lang = context.user_data.get("lang", "EN")
    await query.message.reply_text(
        text=t("transactions_title", lang),
        parse_mode="Markdown",
        reply_markup=build_transaction_periods_keyboard(lang),
    )


async def handle_transactions_by_period(
    update: Update,
    query,
    context: ContextTypes.DEFAULT_TYPE,
    days: int,
    period_key: str,
):
    """
    Fetch and display customer BUY and SELL order transactions within the chosen period.
    """
    lang = context.user_data.get("lang", "EN")
    user = update.effective_user

    orders = await asyncio.to_thread(get_orders_by_period_sync, str(user.id), days)

    period_label = t(period_key, lang)
    if not orders:
        text = f"{t('period_orders_title', lang).format(period=period_label)}{t('no_orders_period', lang)}"
        await query.message.reply_text(
            text=text,
            parse_mode="Markdown",
            reply_markup=build_transaction_result_keyboard(lang),
        )
        return

    # Count Buy and Sell orders
    buy_orders = [o for o in orders if o["order_type"].upper() == "BUY"]
    sell_orders = [o for o in orders if o["order_type"].upper() == "SELL"]
    total_qty = sum(o["quantity_kg"] for o in orders)

    header = t("period_orders_title", lang).format(period=period_label)
    summary_line = (
        f"📊 *{t('total_orders', lang)}:* {len(orders)} ({t('buy', lang)}: {len(buy_orders)} | {t('sell', lang)}: {len(sell_orders)})\n"
        f"⚖️ *{t('total_qty', lang)}:* {total_qty:.2f} kg\n"
        "────────────────────\n\n"
    )

    items_text = ""
    for o in orders:
        is_buy = o["order_type"].upper() == "BUY"
        type_icon = "🟢" if is_buy else "🔴"
        type_label = t("buy", lang) if is_buy else t("sell", lang)
        slot_str = format_date_dd_mm_yy(o["slot_date"]) if o.get("slot_date") else "-"
        premium_str = format_premium(o["premium"])
        date_str = ""
        if o.get("created_at"):
            try:
                dt = datetime.fromisoformat(o["created_at"])
                date_str = dt.strftime("%d/%m/%Y %H:%M")
            except Exception:
                date_str = o["created_at"][:10]

        items_text += (
            f"{type_icon} *{o['order_id']}* ({type_label})\n"
            f"• {t('quantity', lang)}: *{o['quantity_kg']:.2f} kg*\n"
            f"• {t('premium', lang)}: *{premium_str}*\n"
            f"• {t('slot', lang)}: {slot_str}\n"
            f"• {t('status', lang)}: {o['status']}\n"
            f"• {t('created_date', lang)}: {date_str}\n"
            "────────────────────\n"
        )

    full_message = header + summary_line + items_text

    if len(full_message) <= 4000:
        await query.message.reply_text(
            text=full_message,
            parse_mode="Markdown",
            reply_markup=build_transaction_result_keyboard(lang),
        )
    else:
        # Split into readable chunks if message exceeds Telegram limit
        chunks = []
        curr = header + summary_line
        for block in items_text.split("────────────────────\n"):
            if not block.strip():
                continue
            formatted_block = block + "────────────────────\n"
            if len(curr) + len(formatted_block) > 3900:
                chunks.append(curr)
                curr = formatted_block
            else:
                curr += formatted_block
        if curr.strip():
            chunks.append(curr)

        for i, chunk in enumerate(chunks):
            reply_markup = build_transaction_result_keyboard(lang) if i == len(chunks) - 1 else None
            await query.message.reply_text(
                text=chunk,
                parse_mode="Markdown",
                reply_markup=reply_markup,
            )


