import logging

from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, PicklePersistence

from app.config.settings import BOT_TOKEN
from app.config.logger import setup_logger
from app.bot.handlers import start_command, button_handler
from app.models.order import Order
from app.models.slot import Slot


import asyncio
from app.services.promotion_service import promotions_loop, get_promotions_sheet

logger = logging.getLogger(__name__)

async def error_handler(update, context):
    logger.error("Unhandled error: %s", context.error)


async def post_init(application: Application):
    # Auto-initialize the sheet and columns in a background thread to prevent startup blocking
    await asyncio.to_thread(get_promotions_sheet)
    # Start the promotions polling task
    asyncio.create_task(promotions_loop(application))


def main():
    setup_logger()
    persistence = PicklePersistence(filepath="persistence.pickle")
    app = Application.builder().token(BOT_TOKEN).persistence(persistence).post_init(post_init).build()

    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(MessageHandler(filters.TEXT, start_command))
    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_error_handler(error_handler)

    logger.info("Bot is running...")
    app.run_polling()


if __name__ == "__main__":
    main()