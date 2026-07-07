from datetime import datetime

def format_premium(premium) -> str:
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
    # Use current local time for invoice date/time
    now = datetime.now()
    date_str = now.strftime("%d-%b-%Y")
    time_str = now.strftime("%I:%M %p")
    
    # Generate Invoice No: INV-{YYYYMMDD}-{order_suffix}
    order_suffix = order.order_id.split("-")[-1]
    invoice_no = f"INV-{now.strftime('%Y%m%d')}-{order_suffix}"
    
    # Customer Details - Name is capitalized
    full_name = user.first_name or ""
    if user.last_name:
        full_name += f" {user.last_name}"
    full_name = full_name.strip().upper() or "N/A"
    
    username = f"@{user.username}" if user.username else "N/A"
    tg_id = str(user.id)
    
    # Parse premium safely
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
        
    qty = order.quantity_kg
    slot = order.slot_date or "N/A"
    
    # Format premium price with sign (+ or -)
    if unit_price >= 0:
        premium_price_str = f"+${unit_price:,.2f}"
    else:
        premium_price_str = f"-${abs(unit_price):,.2f}"
    
    text = (
        "🧾 INVOICE / វិក្កយបត្រ\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"Invoice No : {invoice_no}\n"
        f"Order ID   : {order.order_id}\n"
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
        "🙏 Thank you for your purchase!\n"
        "សូមអរគុណសម្រាប់ការជាវរបស់អ្នក។"
    )
    return text