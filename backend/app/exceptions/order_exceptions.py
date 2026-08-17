class SlotNotFoundError(Exception):
    """Raised when the selected slot does not exist."""
    pass


class InsufficientStockError(Exception):
    """Raised when stock is not enough for the requested quantity."""
    pass