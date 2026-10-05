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
    is_non_stock_gold,
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
    Format a premium numeric or string value with an explicit '+' sign for non-negative numbers (e.g. +200, +1,600).
    """
    try:
        val_str = str(premium).strip()
        sign = "+"
        if val_str.startswith("+"):
            val_str = val_str[1:]
        elif val_str.startswith("-"):
            sign = "-"
            val_str = val_str[1:]

        val = float(val_str.replace(",", ""))
        if val < 0:
            sign = "-"
            val = abs(val)

        if val == int(val):
            formatted_val = f"{int(val):,}"
        else:
            formatted_val = f"{val:,.2f}".rstrip("0").rstrip(".")

        return f"{sign}{formatted_val}"
    except (ValueError, TypeError):
        return str(premium)


from app.utils.translation import t


def generate_invoice_text(order, user, lang: str = "EN", tier_info: dict | None = None) -> str:
    """
    Generate structured text for a Telegram order purchase invoice receipt.
    Matches the receipt layout and supports bilingual (KH/EN) formatting.
    When an order spans multiple slot tables / price tiers, displays the breakdown
    for each tier with sub-totals, along with total premium and total amount.
    """
    now = to_cambodia_time(getattr(order, "created_at", None))
    date_str = format_date_dd_mm_yy(now)
    time_str = now.strftime("%I:%M %p")

    full_name = user.first_name or ""
    if user.last_name:
        full_name += f" {user.last_name}"
    full_name = full_name.strip().upper() or (f"@{user.username}" if user.username else "N/A")

    # Order direction: from customer perspective
    # Note: store transaction_type 'SELL' means customer bought (ទិញ); 'BUY' means customer sold (លក់)
    txn_type = getattr(order, "transaction_type", None) or getattr(order, "order_type", "BUY")
    if txn_type in ("SELL", "BUY"):
        is_buy = (txn_type == "SELL")
    else:
        is_buy = (txn_type == "BUY")

    type_action = "ទិញ" if (lang == "KH" and is_buy) else ("លក់" if (lang == "KH" and not is_buy) else ("BUY" if is_buy else "SELL"))

    slot_str = format_date_dd_mm_yy(getattr(order, "slot_date_str", None)) or "N/A"
    slot_line = t("receipt_slot_buy", lang).format(date=slot_str) if is_buy else t("receipt_slot_sell", lang).format(date=slot_str)

    qty = float(order.quantity)
    qty_str = f"{qty:.1f}" if (qty == int(qty)) else f"{qty:g}"

    effective_tier = tier_info or getattr(order, "_tier_info", None)
    tiers = effective_tier.get("tiers", []) if (effective_tier and isinstance(effective_tier, dict)) else []

    # If order was split across multiple price tiers, display separate tier calculations and total
    if len(tiers) >= 2:
        breakdown_lines = []
        for item in tiers:
            item_qty = float(item["quantity"])
            item_qty_str = f"{item_qty:.1f}" if (item_qty == int(item_qty)) else f"{item_qty:g}"
            item_rate = format_premium(item["premium"])
            item_subtotal = item_qty * float(item["premium"])
            subtotal_str = format_premium(item_subtotal)
            breakdown_lines.append(
                t("receipt_tier_item", lang).format(
                    qty=item_qty_str,
                    rate=item_rate,
                    subtotal=subtotal_str,
                )
            )

        total_prem_amt = order.premium_amount if getattr(order, "premium_amount", None) is not None else sum(float(t["quantity"]) * float(t["premium"]) for t in tiers)
        premium_section = (
            t("receipt_tier_title", lang) + "\n" +
            "\n".join(breakdown_lines) + "\n" +
            t("receipt_total_premium", lang).format(total_premium=format_premium(total_prem_amt))
        )
    else:
        premium_str = format_premium(order.premium)
        premium_section = t("receipt_premium", lang).format(premium=premium_str)

    total_amount_val = getattr(order, "total_amount", None)
    total_line = ""
    if total_amount_val is not None:
        total_line = "\n" + t("receipt_total_amount", lang).format(total=f"{float(total_amount_val):,.2f}")

    return (
        t("receipt_title", lang) +
        t("receipt_date", lang).format(type=type_action, date=date_str, time=time_str) + "\n" +
        t("receipt_txn_id", lang).format(order_no=order.order_no) + "\n" +
        t("receipt_account", lang).format(name=full_name) + "\n" +
        slot_line + "\n" +
        t("receipt_quantity", lang).format(qty=qty_str) + "\n" +
        premium_section +
        total_line
    )

