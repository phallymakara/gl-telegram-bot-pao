"""
Central Application Logging Configuration.
Implements the engineering team's standard logging policy:

Development:
  - DEBUG -> Your application code (`app`) only
  - INFO -> Important business events
  - WARNING -> Unexpected behavior
  - ERROR -> Failures + traceback
  - Third-party libraries (httpx, httpcore, telegram, asyncio, urllib3) -> WARNING

Production:
  - DEBUG -> OFF
  - INFO -> Business operations
  - WARNING -> Potential problems
  - ERROR -> Failures + traceback
  - CRITICAL -> System failures
  - Third-party libraries -> WARNING / ERROR
"""

import logging
import sys

from app.core.config import ENVIRONMENT, LOG_LEVEL

# ANSI Terminal Color Constants
RESET = "\033[0m"
BOLD = "\033[1m"
GRAY = "\033[90m"
RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
CYAN = "\033[36m"

LEVEL_COLORS = {
    "DEBUG": CYAN,
    "INFO": GREEN,
    "WARNING": YELLOW,
    "ERROR": RED,
    "CRITICAL": f"{BOLD}{RED}",
}


class ColoredFormatter(logging.Formatter):
    """
    Terminal logging formatter with standard engineering colors:
    - Muted timestamp (GRAY)
    - Colorized log level badges ([DEBUG] in Cyan, [INFO] in Green, [WARNING] in Yellow, [ERROR] in Red)
    - Clean compact message output
    """

    def __init__(self, datefmt: str = "%H:%M:%S", is_production: bool = False):
        super().__init__(datefmt=datefmt)
        self.is_production = is_production

    def format(self, record: logging.LogRecord) -> str:
        time_str = self.formatTime(record, self.datefmt)
        level_name = record.levelname
        color = LEVEL_COLORS.get(level_name, "")

        if self.is_production:
            prefix = f"{time_str} [{level_name}] {record.name}:"
        else:
            prefix = f"{GRAY}{time_str}{RESET} {color}[{level_name}]{RESET}"

        message = record.getMessage()
        if record.exc_info:
            if not record.exc_text:
                record.exc_text = self.formatException(record.exc_info)
            message = f"{message}\n{record.exc_text}"

        return f"{prefix} {message}"


class PollingEndpointFilter(logging.Filter):
    """
    Suppresses repetitive HTTP 200/304 polling access logs from the console.
    Ensures developer console stays clean while keeping error/mutation logs visible.
    """
    POLLING_PREFIXES = (
        "/api/orders",
        "/api/purchase-orders",
        "/api/deposits",
        "/api/withdrawals",
        "/api/dashboard/stock-matrix",
        "/api/dashboard/summary",
        "/health",
    )

    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        # Suppress 200 / 304 GET access logs on high-frequency polling routes
        if "GET " in msg and (" 200 " in msg or " 304 " in msg or msg.endswith(" 200") or msg.endswith(" 200 OK")):
            for prefix in self.POLLING_PREFIXES:
                if prefix in msg:
                    return False
        return True


def setup_logging(level: str | None = None, env: str | None = None) -> None:
    """
    Configure central structured logging across the application and third-party libraries.
    """
    current_env = (env or ENVIRONMENT).lower()
    app_log_level_str = level or LOG_LEVEL

    # Resolve application level based on environment
    if current_env == "production":
        app_level = getattr(logging, app_log_level_str.upper(), logging.INFO)
        if app_level < logging.INFO:
            app_level = logging.INFO
        third_party_level = logging.WARNING
        date_format = "%Y-%m-%d %H:%M:%S"
        is_prod = True
    else:
        app_level = getattr(logging, app_log_level_str.upper(), logging.INFO)
        third_party_level = logging.WARNING
        date_format = "%H:%M:%S"
        is_prod = False

    # Configure root logging handler with ColoredFormatter
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(ColoredFormatter(datefmt=date_format, is_production=is_prod))

    root_logger = logging.getLogger()
    root_logger.setLevel(app_level)
    root_logger.handlers = [handler]

    # Set our application loggers explicitly
    logging.getLogger("app").setLevel(app_level)
    logging.getLogger("__main__").setLevel(app_level)

    # Suppress verbose HTTP polling / network logs from third-party libraries
    noisy_third_party_loggers = [
        "httpx",
        "httpcore",
        "telegram",
        "telegram.ext",
        "telegram.ext.ExtBot",
        "telegram.ext.Application",
        "telegram.ext.Updater",
        "telegram.request",
        "telegram.request._httpxrequest",
        "asyncio",
        "urllib3",
        "apscheduler",
    ]

    for logger_name in noisy_third_party_loggers:
        logging.getLogger(logger_name).setLevel(third_party_level)

    # Apply polling endpoint filter to uvicorn access logger
    uvicorn_access = logging.getLogger("uvicorn.access")
    if not any(isinstance(f, PollingEndpointFilter) for f in uvicorn_access.filters):
        uvicorn_access.addFilter(PollingEndpointFilter())


# Alias for backward compatibility
setup_logger = setup_logging