import logging
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from app.utils.helpers import format_premium
from app.utils.translation import t

logger = logging.getLogger(__name__)

from app.constants.callback import (
    BUY,
    SELL,
    MY_ORDERS,
    BACK_MAIN,
    BUY_SLOT_PREFIX,
    SELL_SLOT_PREFIX,
    QTY_PREFIX,
    CONFIRM_ORDER,
    CANCEL_ORDER,
)


LANG_MENU = InlineKeyboardMarkup([
    [
        InlineKeyboardButton("English 🇬🇧", callback_data="LANG_EN"),
        InlineKeyboardButton("ខ្មែរ 🇰🇭", callback_data="LANG_KH"),
    ]
])


MAIN_MENU = InlineKeyboardMarkup([
    [
        InlineKeyboardButton("🔴 SELL", callback_data=SELL),
        InlineKeyboardButton("🟢 BUY", callback_data=BUY),
        
    ],
    [
        InlineKeyboardButton("📋 My Orders", callback_data=MY_ORDERS),
    ],
])


def build_main_menu(lang="EN"):
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


def build_slot_keyboard(slots, order_type=BUY, lang="EN"):
    keyboard = []

    prefix = BUY_SLOT_PREFIX if order_type == BUY else SELL_SLOT_PREFIX

    for slot in slots:
        # Hide slots with 0 or negative stock in the BUY flow
        if order_type == BUY:
            try:
                stock_val = float(str(slot.get('stock_kg', 0)).strip())
            except (ValueError, TypeError):
                stock_val = 0.0
            if stock_val <= 0:
                continue

        label = t("slot_format", lang).format(
            date=slot['slot_date'],
            premium=format_premium(slot['premium']),
            stock=slot['stock_kg']
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


def build_quantity_keyboard(stock=None, order_type=BUY, lang="EN"):
    logger.info("build_quantity_keyboard | stock=%s | order_type=%s", stock, order_type)
    if order_type == SELL or stock is None:
        max_allowed_qty = 5
    else:
        try:
            max_allowed_qty = int(float(stock))
        except (ValueError, TypeError):
            max_allowed_qty = 0
            
    logger.info("build_quantity_keyboard | max_allowed_qty=%d", max_allowed_qty)

    buttons = []
    for q in [1, 2, 3, 4, 5]:
        if q <= max_allowed_qty:
            buttons.append(InlineKeyboardButton(f"{q} kg", callback_data=f"{QTY_PREFIX}{q}"))
        else:
            # Mark unavailable options as locked
            buttons.append(InlineKeyboardButton(f"🔒 {q} kg", callback_data="IGNORE"))

    keyboard = [
        [buttons[0], buttons[1]],
        [buttons[2], buttons[3]],
        [buttons[4]],
        [InlineKeyboardButton(t("back_slots", lang), callback_data=BUY if order_type == BUY else SELL)],
    ]
    return InlineKeyboardMarkup(keyboard)


def build_confirmation_keyboard(selected_slot, order_type=BUY, lang="EN"):
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


def build_back_main_keyboard(lang="EN"):
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t("back_main", lang), callback_data=BACK_MAIN),
            InlineKeyboardButton(t("done", lang), callback_data=BACK_MAIN),
        ]
    ])