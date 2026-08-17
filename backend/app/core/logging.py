import logging
import sys
from app.core.config import LOG_LEVEL


def setup_logging(level: str | None = None) -> None:
    """
    Configure application-wide structured logging format and handlers.
    """
    log_level = level or LOG_LEVEL
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
        force=True,
    )
    logging.getLogger("uvicorn.access").setLevel(numeric_level)
    logging.getLogger("httpx").setLevel(logging.WARNING)


# Alias for backward compatibility
setup_logger = setup_logging
