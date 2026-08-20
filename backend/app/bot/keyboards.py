"""
Telegram Bot Inline Keyboards Builder.
Constructs multi-language inline keyboard markup for menus, slot selection, quantity selection, and confirmation actions.
"""

import logging
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

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
from app.utils.helpers import format_premium
from app.utils.translation import t

logger = logging.getLogger(__name__)

# Default language selection keyboard
LANG_MENU = InlineKeyboardMarkup([
    [
        InlineKeyboardButton("English", callback_data="LANG_EN"),
        InlineKeyboardButton("ខ្មែរ", callback_data="LANG_KH"),
    ]
])

# Default main menu keyboard template
MAIN_MENU = InlineKeyboardMarkup([
    [
        InlineKeyboardButton("SELL", callback_data=SELL),
        InlineKeyboardButton("BUY", callback_data=BUY),
    ],
    [
        InlineKeyboardButton("My Orders", callback_data=MY_ORDERS),
    ],
])


def build_main_menu(lang="EN") -> InlineKeyboardMarkup:
    """
    Construct Telegram bot main menu inline keyboard with translated labels.
    """
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t("sell", lang), callback_data=SELL),
            InlineKeyboardButton(t("buy", lang), callback_data=BUY),
        ],
        [
            InlineKeyboardButton(t("my_orders", lang), callback_data=MY_ORDERS),

        ],
        [
            InlineKeyboardButton(t("switch_lang", lang), callback_data="SWITCH_LANG"),
        ],
    ])


def build_slot_keyboard(slots, order_type=BUY, lang="EN") -> InlineKeyboardMarkup:
    """
    Construct keyboard listing available slot dates for selection.
    Shows total available (incoming + general stock) and hides slots with zero availability.
    """
    keyboard = []
    prefix = BUY_SLOT_PREFIX if order_type == BUY else SELL_SLOT_PREFIX

    for slot in slots:
        if order_type == BUY:
            try:
                incoming = float(str(slot.get("incoming_kg", 0)).strip())
                stock = float(str(slot.get("stock_kg", 0)).strip())
                total_available = incoming + stock
            except (ValueError, TypeError):
                total_available = 0.0
            if total_available <= 0:
                continue

        label = t("slot_format", lang).format(
            date=slot["slot_date"],
            premium=format_premium(slot["premium"]),
        )
        keyboard.append([
            InlineKeyboardButton(
                label,
                callback_data=f"{prefix}{slot['slot_date']}",
            )
        ])

    keyboard.append([
        InlineKeyboardButton(t("back_main", lang), callback_data=BACK_MAIN)
    ])

    return InlineKeyboardMarkup(keyboard)


def build_quantity_keyboard(stock=None, incoming_kg=None, order_type=BUY, lang="EN") -> InlineKeyboardMarkup:
    """
    Construct keyboard displaying quantity options (1kg - 5kg) based on total available stock.
    Total available = incoming_kg (day-specific) + stock (general vault).
    """
    if incoming_kg is not None and stock is not None:
        total = float(incoming_kg) + float(stock)
    elif stock is not None:
        total = float(stock)
    else:
        total = 0

    logger.info("build_quantity_keyboard | incoming=%s stock=%s total=%s order_type=%s", incoming_kg, stock, total, order_type)

    if order_type == SELL or total <= 0:
        max_allowed_qty = 5 if order_type == SELL else 0
    else:
        try:
            max_allowed_qty = int(total)
        except (ValueError, TypeError):
            max_allowed_qty = 0

    logger.info("build_quantity_keyboard | max_allowed_qty=%d", max_allowed_qty)

    buttons = []
    for q in [1, 2, 3, 4, 5]:
        if q <= max_allowed_qty:
            buttons.append(InlineKeyboardButton(f"{q} kg", callback_data=f"{QTY_PREFIX}{q}"))
        else:
            buttons.append(InlineKeyboardButton(f"{q} kg (N/A)", callback_data="IGNORE"))

    keyboard = [
        [buttons[0], buttons[1]],
        [buttons[2], buttons[3]],
        [buttons[4]],
        [InlineKeyboardButton(t("back_slots", lang), callback_data=BUY if order_type == BUY else SELL)],
    ]
    return InlineKeyboardMarkup(keyboard)


def build_confirmation_keyboard(selected_slot, order_type=BUY, lang="EN") -> InlineKeyboardMarkup:
    """
    Construct confirmation keyboard for order review step.
    """
    prefix = BUY_SLOT_PREFIX if order_type == BUY else SELL_SLOT_PREFIX

    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t("confirm", lang), callback_data=CONFIRM_ORDER),
            InlineKeyboardButton(t("cancel", lang), callback_data=CANCEL_ORDER),
        ],
        [
            InlineKeyboardButton(
                t("back_qty", lang),
                callback_data=f"{prefix}{selected_slot}",
            ),
        ],
    ])


def build_back_main_keyboard(lang="EN") -> InlineKeyboardMarkup:
    """
    Construct generic back/done keyboard for simple views.
    """
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t("back_main", lang), callback_data=BACK_MAIN),
            InlineKeyboardButton(t("done", lang), callback_data=BACK_MAIN),
        ]
    ])