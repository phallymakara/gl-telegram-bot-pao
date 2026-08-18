"""
Gold Pricing & Cost Calculation Utilities.
Centralizes standard Troy Ounce to Kilogram conversion factor (32.148 oz/kg) and formula calculations for unit costs, total order values, and premium amounts.
"""

from decimal import Decimal

# Troy Ounce to Kilogram conversion factor constant (1 Kilogram = 32.148 Troy Ounces)
TROY_OUNCES_PER_KG = Decimal("32.148")

# Default spot price and premium fallback constants
DEFAULT_SPOT_PRICE = Decimal("4376.20")
DEFAULT_PREMIUM = Decimal("200.00")


def to_decimal(value: Decimal | float | str | None, default: Decimal = Decimal(0)) -> Decimal:
    """
    Helper utility to cleanly convert raw inputs (str, float, Decimal, or None) to sanitized Decimal instances.
    Strips commas and whitespace before conversion.
    """
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
    Calculate unit cost per Kilogram based on spot price (per Troy oz) and premium:
    formula: unit_cost = (spot_price * 32.148) + premium
    """
    spot_dec = to_decimal(spot_price, DEFAULT_SPOT_PRICE)
    prem_dec = to_decimal(premium, DEFAULT_PREMIUM)
    return (spot_dec * TROY_OUNCES_PER_KG) + prem_dec


def calculate_total_cost(
    quantity: Decimal | float | str,
    unit_cost: Decimal | float | str,
) -> Decimal:
    """
    Calculate total order or PO cost:
    formula: total_cost = quantity_kg * unit_cost_per_kg
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
    Calculate total order value directly from quantity, spot price, and premium per Kilogram.
    """
    unit_cost = calculate_unit_cost(spot_price, premium)
    return calculate_total_cost(quantity, unit_cost)


def calculate_premium_amount(
    quantity: Decimal | float | str,
    premium: Decimal | float | str | None,
) -> Decimal:
    """
    Calculate total premium portion for an order:
    formula: premium_amount = quantity_kg * premium_per_kg
    """
    qty_dec = to_decimal(quantity, Decimal(0))
    prem_dec = to_decimal(premium, DEFAULT_PREMIUM)
    return qty_dec * prem_dec

