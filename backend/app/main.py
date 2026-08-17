import logging
import asyncio

from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, PicklePersistence

from app.core.config import BOT_TOKEN
from app.core.logging import setup_logging
from app.bot.handlers import start_command, button_handler
from app.db import base  # ensure all SQLAlchemy models are registered
from app.services.promotion_service import promotions_loop


logger = logging.getLogger(__name__)

async def error_handler(update, context):
    logger.error("Unhandled error: %s", context.error)


async def post_init(application: Application):
    asyncio.create_task(promotions_loop(application))


def main():
    setup_logging()
    logger.info("Initializing Gold Trading Bot application...")
    persistence = PicklePersistence(filepath="persistence.pickle")
    app = Application.builder().token(BOT_TOKEN).persistence(persistence).post_init(post_init).build()

    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(MessageHandler(filters.TEXT, start_command))
    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_error_handler(error_handler)

    logger.info("Bot handlers registered successfully. Starting long polling...")
    app.run_polling()



if __name__ == "__main__":
    main()
