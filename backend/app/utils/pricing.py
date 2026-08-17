from decimal import Decimal

# Troy Ounce to Kilogram conversion constant
TROY_OUNCES_PER_KG = Decimal("32.148")
DEFAULT_SPOT_PRICE = Decimal("4376.20")
DEFAULT_PREMIUM = Decimal("200.00")


def to_decimal(value: Decimal | float | str | None, default: Decimal = Decimal(0)) -> Decimal:
    """Helper to cleanly convert inputs (str, float, Decimal, or None) to Decimal."""
    if value is None:
        return default
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value).strip().replace(",", ""))
    except (ValueError, TypeError):
        return default


def calculate_unit_cost(
    spot_price: Decimal | float | str | None,
    premium: Decimal | float | str | None,
) -> Decimal:
    """
    Calculate the unit cost per Kilogram based on spot price (per Troy oz) and premium:
    unit_cost = (spot_price * 32.148) + premium
    """
    spot_dec = to_decimal(spot_price, DEFAULT_SPOT_PRICE)
    prem_dec = to_decimal(premium, DEFAULT_PREMIUM)
    return (spot_dec * TROY_OUNCES_PER_KG) + prem_dec


def calculate_total_cost(
    quantity: Decimal | float | str,
    unit_cost: Decimal | float | str,
) -> Decimal:
    """
    Calculate total cost:
    total_cost = quantity * unit_cost
    """
    qty_dec = to_decimal(quantity, Decimal(0))
    cost_dec = to_decimal(unit_cost, Decimal(0))
    return qty_dec * cost_dec


def calculate_order_total(
    quantity: Decimal | float | str,
    spot_price: Decimal | float | str | None,
    premium: Decimal | float | str | None,
) -> Decimal:
    """
    Calculate total order amount directly from quantity, spot price, and premium.
    """
    unit_cost = calculate_unit_cost(spot_price, premium)
    return calculate_total_cost(quantity, unit_cost)


def calculate_premium_amount(
    quantity: Decimal | float | str,
    premium: Decimal | float | str | None,
) -> Decimal:
    """
    Calculate total premium amount for an order:
    premium_amount = quantity * premium
    """
    qty_dec = to_decimal(quantity, Decimal(0))
    prem_dec = to_decimal(premium, DEFAULT_PREMIUM)
    return qty_dec * prem_dec
