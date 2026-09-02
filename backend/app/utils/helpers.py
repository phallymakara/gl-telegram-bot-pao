"""
General Bot & Format Helper Utilities.
Exports formatting functions for premium values, invoice text generation, and re-exports pricing and generator helpers.
"""

from datetime import date, datetime, timedelta, timezone

from app.utils.generators import generate_order_no, generate_po_no, generate_return_no
from app.utils.pricing import (
    DEFAULT_PREMIUM,
    DEFAULT_SPOT_PRICE,
    TROY_OUNCES_PER_KG,
    calculate_order_total,
    calculate_premium_amount,
    calculate_total_cost,
    calculate_unit_cost,
)

# Cambodia timezone is UTC+7 (ICT - Indochina Time)
CAMBODIA_TZ = timezone(timedelta(hours=7), name="ICT")


def get_cambodia_now() -> datetime:
    """
    Get current datetime in Cambodia timezone (UTC+7).
    """
    return datetime.now(CAMBODIA_TZ)


def to_cambodia_time(dt: datetime | None) -> datetime:
    """
    Convert any datetime to Cambodia timezone (UTC+7).
    If naive datetime is provided, treats it as UTC then converts to Cambodia time.
    """
    if dt is None:
        return get_cambodia_now()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(CAMBODIA_TZ)


def format_date_dd_mm_yy(val) -> str:
    """
    Format a date string, date, or datetime object into DD-MM-YY (e.g. 21-08-26) in Cambodia time.
    """
    if not val:
        return ""
    if isinstance(val, datetime):
        return to_cambodia_time(val).strftime("%d-%m-%y")
    if isinstance(val, date):
        return val.strftime("%d-%m-%y")

    val_str = str(val).strip()
    for fmt in (
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%d-%m-%y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%d/%m/%y",
        "%d-%b-%Y",
        "%d-%b-%y",
    ):
        try:
            dt = datetime.strptime(val_str, fmt)
            return dt.strftime("%d-%m-%y")
        except ValueError:
            pass
    return val_str


def format_premium(premium) -> str:
    """
    Format a premium numeric or string value with an explicit '+' sign for non-negative numbers (e.g. +200).
    """
    try:
        val_str = str(premium).strip()
        if val_str.startswith("+") or val_str.startswith("-"):
            return val_str
        val = float(val_str)
        if val >= 0:
            formatted_val = f"{val:g}"
            return f"+{formatted_val}"
        else:
            return f"{val:g}"
    except (ValueError, TypeError):
        return str(premium)


from app.utils.translation import t


def generate_invoice_text(order, user, lang: str = "EN") -> str:
    """
    Generate structured text for a Telegram order purchase invoice receipt.
    Matches the receipt layout and supports bilingual (KH/EN) formatting.
    """
    now = to_cambodia_time(getattr(order, "created_at", None))
    date_str = format_date_dd_mm_yy(now)
    time_str = now.strftime("%I:%M %p")

    full_name = user.first_name or ""
    if user.last_name:
        full_name += f" {user.last_name}"
    full_name = full_name.strip().upper() or (f"@{user.username}" if user.username else "N/A")

    order_type = getattr(order, "order_type", "BUY")
    is_buy = (order_type == "BUY")
    type_action = "ទិញ" if (lang == "KH" and is_buy) else ("លក់" if (lang == "KH" and not is_buy) else ("BUY" if is_buy else "SELL"))

    slot_str = format_date_dd_mm_yy(getattr(order, "slot_date_str", None)) or "N/A"
    slot_line = t("receipt_slot_buy", lang).format(date=slot_str) if is_buy else t("receipt_slot_sell", lang).format(date=slot_str)

    qty = float(order.quantity)
    qty_str = f"{qty:.1f}" if (qty == int(qty)) else f"{qty:g}"

    premium_str = format_premium(order.premium)

    return (
        t("receipt_title", lang) +
        t("receipt_date", lang).format(type=type_action, date=date_str, time=time_str) + "\n" +
        t("receipt_txn_id", lang).format(order_no=order.order_no) + "\n" +
        t("receipt_account", lang).format(name=full_name) + "\n" +
        slot_line + "\n" +
        t("receipt_quantity", lang).format(qty=qty_str) + "\n" +
        t("receipt_premium", lang).format(premium=premium_str)
    )

