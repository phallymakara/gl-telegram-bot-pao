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


def setup_logging(level: str | None = None, env: str | None = None) -> None:
    """
    Configure central structured logging across the application and third-party libraries.
    """
    current_env = (env or ENVIRONMENT).lower()
    app_log_level_str = level or LOG_LEVEL

    # Resolve application level based on environment
    if current_env == "production":
        app_level = getattr(logging, app_log_level_str.upper(), logging.INFO)
        # Ensure DEBUG is strictly OFF in production
        if app_level < logging.INFO:
            app_level = logging.INFO
        third_party_level = logging.WARNING
    else:
        # Development: Application logs at DEBUG (or configured level)
        app_level = getattr(logging, app_log_level_str.upper(), logging.DEBUG)
        third_party_level = logging.WARNING

    # Configure root logging handler with standard clean timestamp format
    logging.basicConfig(
        level=app_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
        force=True,
    )

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
        "uvicorn.access",
        "uvicorn.error",
        "apscheduler",
    ]

    for logger_name in noisy_third_party_loggers:
        logging.getLogger(logger_name).setLevel(third_party_level)


# Alias for backward compatibility
setup_logger = setup_logging