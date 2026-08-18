"""
Domain Order Exception Classes.
Custom exceptions for domain-level validation failures during order processing.
"""


class SlotNotFoundError(Exception):
    """Raised when the selected slot date or row does not exist."""
    pass


class InsufficientStockError(Exception):
    """Raised when available physical gold stock is insufficient for the requested quantity."""
    pass