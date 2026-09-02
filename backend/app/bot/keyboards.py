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
    CONFIRM_DEPOSIT,
    CONFIRM_ORDER,
    CONTACT_SALES,
    CUSTOM_QTY,
    DEPOSIT,
    DEPOSIT_BANK,
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
    WITHDRAW_CASH,
)
from app.utils.helpers import format_date_dd_mm_yy, format_premium
from app.utils.translation import t

logger = logging.getLogger(__name__)

# Default language selection keyboard
LANG_MENU = InlineKeyboardMarkup([
    [
        InlineKeyboardButton("ខ្មែរ", callback_data="LANG_KH"),
        InlineKeyboardButton("English", callback_data="LANG_EN"),
    ]
])

# Default main menu keyboard template
MAIN_MENU = InlineKeyboardMarkup([
    [
        InlineKeyboardButton("ប្រគល់ទំនិញ (លក់)", callback_data=SELL),
        InlineKeyboardButton("ទទួលទំនិញ (ទិញ)", callback_data=BUY),
    ],
    [
        InlineKeyboardButton("ដាក់ប្រាក់", callback_data=DEPOSIT),
        InlineKeyboardButton("ដកប្រាក់", callback_data=WITHDRAW),
    ],
    [
        InlineKeyboardButton("ទំនាក់ទំនងទៅកាន់ ភ្នាក់ងារលក់ 📞", callback_data=CONTACT_SALES),
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
            InlineKeyboardButton(t("deposit", lang), callback_data=DEPOSIT),
            InlineKeyboardButton(t("withdraw", lang), callback_data=WITHDRAW),
        ],
        [
            InlineKeyboardButton(t("contact_sales", lang), callback_data=CONTACT_SALES),
        ],
    ])


def get_slots_title(slots, lang="EN") -> str:
    """
    Determine slot selection message title based on whether slots have positive or negative premiums.
    If slot premium is negative (< 0), shows discount prompt:
      'សូមជ្រើសរើសតម្លៃបញ្ចុះតម្លៃ ទៅតាមកាលបរិច្ឆេទទូទាត់នីមួយៗ៖'
    If slot premium is positive (>= 0), shows premium prompt:
      'សូមជ្រើសរើសតម្លៃបុព្វលាភ ទៅតាមកាលបរិច្ឆេទទូទាត់នីមួយៗ៖'
    """
    if not slots:
        return t("slots_title_positive", lang)

    try:
        raw_premium = slots[0].get("premium", 0)
        val = float(str(raw_premium).replace("+", "").strip())
        if val < 0:
            return t("slots_title_negative", lang)
    except (ValueError, TypeError):
        pass

    return t("slots_title_positive", lang)


def build_slot_keyboard(slots, order_type=BUY, lang="EN") -> InlineKeyboardMarkup:
    """
    Construct keyboard listing available slot dates for selection.
    Shows total available (incoming + general stock) and hides slots with zero availability.
    Formats label with date and premium/discount (+/-).
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

        raw_premium = slot.get("premium", 0)
        try:
            val = float(str(raw_premium).replace("+", "").strip())
        except (ValueError, TypeError):
            val = 0.0

        format_key = "slot_format_positive" if val >= 0 else "slot_format_negative"
        label = t(format_key, lang).format(
            date=format_date_dd_mm_yy(slot["slot_date"]),
            premium=format_premium(raw_premium),
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
    Construct keyboard displaying quantity options (1kg - 5kg) and custom input.
    Layout:
      [1 kg]  [2 kg]
      [3 kg]  [4 kg]
      [5 kg]  [Enter Number]
      [Back]
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

    unit = t("kg_unit", lang)
    buttons = []
    for q in [1, 2, 3, 4, 5]:
        if q <= max_allowed_qty or order_type == SELL:
            buttons.append(InlineKeyboardButton(f"{q} {unit}", callback_data=f"{QTY_PREFIX}{q}"))
        else:
            buttons.append(InlineKeyboardButton(f"{q} {unit} (N/A)", callback_data="IGNORE"))

    custom_btn = InlineKeyboardButton(t("custom_qty", lang), callback_data=CUSTOM_QTY)

    keyboard = [
        [buttons[0], buttons[1]],
        [buttons[2], buttons[3]],
        [buttons[4], custom_btn],
        [InlineKeyboardButton(t("back_slots", lang), callback_data=BUY if order_type == BUY else SELL)],
    ]
    return InlineKeyboardMarkup(keyboard)


def build_numpad_keyboard(lang="EN") -> InlineKeyboardMarkup:
    """
    Construct interactive numeric keypad keyboard (1-9, ., 0, Del, Back, OK).
    """
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("1", callback_data=f"{PAD_DIGIT_PREFIX}1"),
            InlineKeyboardButton("2", callback_data=f"{PAD_DIGIT_PREFIX}2"),
            InlineKeyboardButton("3", callback_data=f"{PAD_DIGIT_PREFIX}3"),
        ],
        [
            InlineKeyboardButton("4", callback_data=f"{PAD_DIGIT_PREFIX}4"),
            InlineKeyboardButton("5", callback_data=f"{PAD_DIGIT_PREFIX}5"),
            InlineKeyboardButton("6", callback_data=f"{PAD_DIGIT_PREFIX}6"),
        ],
        [
            InlineKeyboardButton("7", callback_data=f"{PAD_DIGIT_PREFIX}7"),
            InlineKeyboardButton("8", callback_data=f"{PAD_DIGIT_PREFIX}8"),
            InlineKeyboardButton("9", callback_data=f"{PAD_DIGIT_PREFIX}9"),
        ],
        [
            InlineKeyboardButton(".", callback_data=PAD_DOT),
            InlineKeyboardButton("0", callback_data=f"{PAD_DIGIT_PREFIX}0"),
            InlineKeyboardButton(t("pad_del", lang), callback_data=PAD_DEL),
        ],
        [
            InlineKeyboardButton(t("pad_back", lang), callback_data=PAD_BACK),
            InlineKeyboardButton(t("pad_ok", lang), callback_data=PAD_OK),
        ],
    ])


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
                t("back_slots", lang),
                callback_data=f"{prefix}{selected_slot}",
            ),
        ],
    ])


def build_deposit_confirmation_keyboard(lang="EN") -> InlineKeyboardMarkup:
    """
    Construct confirmation keyboard for deposit step matching the requested design:
      Row 1: [ តាមគណនីធនាគារ/មូលប្បទានប័ត្រ ] [ សាច់ប្រាក់ ]
      Row 2: [ បោះបង់ ] [ ថយក្រោយ ]
    """
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t("deposit_bank_btn", lang), callback_data=DEPOSIT_BANK),
            InlineKeyboardButton(t("deposit_cash_btn", lang), callback_data=DEPOSIT_CASH),
        ],
        [
            InlineKeyboardButton(t("cancel", lang), callback_data=CANCEL_ORDER),
            InlineKeyboardButton(t("back_slots", lang), callback_data=DEPOSIT),
        ],
    ])


def build_withdraw_confirmation_keyboard(lang="EN") -> InlineKeyboardMarkup:
    """
    Construct confirmation keyboard for withdrawal step matching the requested design:
      Row 1: [ តាមគណនីធនាគារ/មូលប្បទានប័ត្រ ] [ សាច់ប្រាក់ ]
      Row 2: [ បោះបង់ ] [ ថយក្រោយ ]
    """
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t("deposit_bank_btn", lang), callback_data=WITHDRAW_BANK),
            InlineKeyboardButton(t("deposit_cash_btn", lang), callback_data=WITHDRAW_CASH),
        ],
        [
            InlineKeyboardButton(t("cancel", lang), callback_data=CANCEL_ORDER),
            InlineKeyboardButton(t("back_slots", lang), callback_data=WITHDRAW),
        ],
    ])


def build_attach_doc_keyboard(lang="EN") -> InlineKeyboardMarkup:
    """
    Construct keyboard for attach document screen:
      [ ថយក្រោយ / Back ] [ បោះបង់ / Cancel ]
    """
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t("back_slots", lang), callback_data=PAD_OK),
            InlineKeyboardButton(t("cancel", lang), callback_data=CANCEL_ORDER),
        ]
    ])


def build_deposit_details_keyboard(lang="EN") -> InlineKeyboardMarkup:
    """
    Construct keyboard for deposit details confirmation matching image:
      [ ថយក្រោយ / Back ] [ រួចរាល់ / Done ]
    """
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t("back_slots", lang), callback_data=PAD_OK),
            InlineKeyboardButton(t("done", lang), callback_data=BACK_MAIN),
        ]
    ])


def build_invoice_keyboard(lang="EN") -> InlineKeyboardMarkup:
    """
    Construct invoice / receipt keyboard matching customer layout:
      [ ចាប់ផ្តើមម្តងទៀត / Start Again ]
      [ រួចរាល់ / Done ]
    """
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(t("start_again", lang), callback_data=BACK_MAIN)],
        [InlineKeyboardButton(t("done", lang), callback_data=BACK_MAIN)],
    ])


def build_custom_qty_keyboard(lang="EN") -> InlineKeyboardMarkup:
    """
    Construct keyboard for custom quantity input screen:
      [ ថយក្រោយ / Back ] [ បោះបង់ / Cancel ]
    """
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t("back_slots", lang), callback_data=PAD_BACK),
            InlineKeyboardButton(t("cancel", lang), callback_data=CANCEL_ORDER),
        ]
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