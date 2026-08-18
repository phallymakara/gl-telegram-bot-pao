"""
Promotions & Alert Broadcast Service.
Runs a background loop checking for active promotional alerts and broadcasting messages to all whitelisted Telegram customers.
"""

import asyncio
import logging
from datetime import datetime, timezone

from telegram.error import Forbidden, TelegramError
from telegram.ext import Application

import app.db.base  # ensure all models are registered before SQLAlchemy operations
from app.core.database import SessionLocal
from app.models.alert import Alert
from app.models.customer import Customer

logger = logging.getLogger(__name__)


async def get_all_users() -> set:
    """
    Retrieve set of all whitelisted Telegram user IDs.
    """
    session = SessionLocal()
    try:
        customers = session.query(Customer).all()
        return {c.telegram_user_id for c in customers if c.telegram_user_id}
    finally:
        session.close()


async def check_and_send_promotions(application: Application):
    """
    Evaluate pending promotional alerts in database.
    Broadcasts message text to registered Telegram chat IDs and deactivates expired alerts.
    """
    session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        pending = (
            session.query(Alert)
            .filter(Alert.type == "PROMOTION", Alert.is_active == True)
            .all()
        )
        user_ids = await get_all_users()

        for alert in pending:
            if alert.start_at and alert.start_at > now:
                continue
            if alert.end_at and alert.end_at < now:
                alert.is_active = False
                session.commit()
                continue

            message = alert.message
            if not message:
                continue

            sent_count = 0
            for tg_id in user_ids:
                try:
                    await application.bot.send_message(chat_id=tg_id, text=message)
                    sent_count += 1
                except Forbidden:
                    logger.warning("Forbidden: User %s blocked the bot", tg_id)
                except TelegramError as e:
                    logger.error("TelegramError sending to %s: %s", tg_id, e)
                # Rate limit sleeping (50ms per message) to prevent hitting Telegram API broadcast limits
                await asyncio.sleep(0.05)

            logger.info("Promotion '%s' sent to %d/%d users", alert.title, sent_count, len(user_ids))
    finally:
        session.close()


async def promotions_loop(application: Application):
    """
    Standing background loop executing check_and_send_promotions every 60 seconds.
    """
    logger.info("Promotions background loop started")
    while True:
        try:
            await check_and_send_promotions(application)
        except Exception as e:
            logger.error("Error in promotions loop: %s", e)
        await asyncio.sleep(60)

