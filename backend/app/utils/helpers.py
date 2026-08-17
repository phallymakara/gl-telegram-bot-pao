from datetime import datetime

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


def format_premium(premium) -> str:
    """
    Format a premium numeric or string value with an explicit '+' sign for positive numbers.
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


def generate_invoice_text(order, user) -> str:
    """
    Generate structured text for a Telegram order purchase invoice.
    """
    now = datetime.now()
    date_str = now.strftime("%d-%b-%Y")
    time_str = now.strftime("%I:%M %p")

    order_suffix = order.order_no.split("-")[-1]
    invoice_no = f"INV-{now.strftime('%Y%m%d')}-{order_suffix}"

    full_name = user.first_name or ""
    if user.last_name:
        full_name += f" {user.last_name}"
    full_name = full_name.strip().upper() or "N/A"

    username = f"@{user.username}" if user.username else "N/A"
    tg_id = str(user.id)

    try:
        raw_premium = str(order.premium).strip().replace(",", "")
        is_negative = raw_premium.startswith("-")
        if is_negative:
            raw_premium = raw_premium.lstrip("-")
        elif raw_premium.startswith("+"):
            raw_premium = raw_premium.lstrip("+")
        unit_price = float(raw_premium)
        if is_negative:
            unit_price = -unit_price
    except (ValueError, TypeError):
        unit_price = 0.0

    qty = float(order.quantity)
    slot = order.slot_date_str or "N/A"

    if unit_price >= 0:
        premium_price_str = f"+${unit_price:,.2f}"
    else:
        premium_price_str = f"-${abs(unit_price):,.2f}"

    text = (
        "INVOICE / វិក្កយបត្រ\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"Invoice No : {invoice_no}\n"
        f"Order ID   : {order.order_no}\n"
        f"Date       : {date_str}\n"
        f"Time       : {time_str}\n\n"
        "Customer Information\n"
        "──────────────────────\n"
        f"Name           : {full_name}\n"
        f"Username       : {username}\n"
        f"Telegram ID    : {tg_id}\n\n"
        "Order Details\n"
        "──────────────────────\n"
        f"Slot           : {slot}\n"
        f"Quantity       : {qty:g} Kg\n"
        f"Premium Price  : {premium_price_str}\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "Thank you for your purchase!\n"
        "សូមអរគុណសម្រាប់ការជាវរបស់អ្នក។"
    )
    return text
