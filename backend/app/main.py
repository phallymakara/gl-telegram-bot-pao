"""
Telegram Bot Application Main Entrypoint.
Initializes python-telegram-bot Application instance, registers handlers, starts background promotion broadcast task, and listens via long polling.
"""

import asyncio
import logging

from telegram.ext import Application, CallbackQueryHandler, CommandHandler, MessageHandler, PicklePersistence, filters

from app.bot.handlers import button_handler, start_command
from app.core.config import BOT_TOKEN
from app.core.logging import setup_logging
from app.db import base  # ensure all SQLAlchemy models are registered
from app.services.promotion_service import promotions_loop

logger = logging.getLogger(__name__)


async def error_handler(update, context):
    """Global unhandled exception logger for Telegram bot handlers."""
    logger.error("Unhandled error: %s", context.error)


async def post_init(application: Application):
    """
    Post-initialization hook executed after bot application startup.
    Spawns background task for promotional alert broadcasting.
    """
    asyncio.create_task(promotions_loop(application))


def main():
    """
    Initialize Telegram bot application, configure persistent user state storage,
    attach command/callback handlers, and launch long-polling event loop.
    """
    setup_logging()
    logger.info("Initializing Gold Trading Bot application...")
    persistence = PicklePersistence(filepath="persistence.pickle")
    app = Application.builder().token(BOT_TOKEN).persistence(persistence).post_init(post_init).build()

    # Register bot handlers
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(MessageHandler(filters.PHOTO | filters.Document.ALL | filters.TEXT, start_command))
    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_error_handler(error_handler)

    logger.info("Bot handlers registered successfully. Starting long polling...")
    app.run_polling()


if __name__ == "__main__":
    main()

