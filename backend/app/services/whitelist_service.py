"""
Telegram Whitelist & Security Service.
Provides in-memory cached database customer whitelist lookups and security decorator to block unauthorized Telegram bot access.
"""

import asyncio
import logging
import time
from functools import wraps

from telegram import Update
from telegram.ext import ContextTypes

import app.db.base  # ensure all models are registered before SQLAlchemy operations
from app.core.database import SessionLocal
from app.models.customer import Customer
from app.utils.translation import t

logger = logging.getLogger(__name__)

# Short-lived in-memory cache for customer whitelist queries (5 seconds TTL)
_cached_users = set()
_last_fetch_time = 0
CACHE_TTL = 5


async def load_whitelist(force_refresh=False) -> set:
    """
    Retrieve set of authorized Telegram user IDs and usernames from customer whitelist table.
    Caches result for 5 seconds to reduce database round-trips during rapid bot interactions.
    """
    global _cached_users, _last_fetch_time
    current_time = time.time()
    if not force_refresh and (current_time - _last_fetch_time < CACHE_TTL):
        return _cached_users
    try:
        session = SessionLocal()
        try:
            customers = session.query(Customer).all()
            allowed = set()
            for c in customers:
                if c.telegram_user_id:
                    allowed.add(c.telegram_user_id)
                if c.username:
                    allowed.add(c.username.strip().lower().lstrip("@"))
            _cached_users = allowed
            _last_fetch_time = current_time
            logger.info("Whitelist loaded from DB: %d allowed targets", len(_cached_users))
        finally:
            session.close()
    except Exception as e:
        logger.error("Failed to load whitelist from DB: %s", e)
    return _cached_users


async def is_user_allowed(username: str, telegram_id: str) -> bool:
    """
    Check if username or telegram_id exists in the active whitelist set.
    """
    allowed_list = await load_whitelist()
    clean_username = username.strip().lower().lstrip("@") if username else ""
    str_tg_id = str(telegram_id).strip()
    return (clean_username in allowed_list) or (str_tg_id in allowed_list)


def restricted(func):
    """
    Security decorator for Telegram bot command and callback handlers.
    Verifies user authorization against customer whitelist. Blocks unauthorized users and prints terminal security alert logs.
    """
    @wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        user = update.effective_user
        if not user:
            return
        username = user.username or ""
        telegram_id = str(user.id)

        allowed_list = await load_whitelist()
        clean_username = username.strip().lower().lstrip("@") if username else ""
        str_tg_id = str(telegram_id).strip()

        is_allowed = (clean_username and clean_username in allowed_list) or (str_tg_id in allowed_list)

        if not is_allowed:
            logger.warning(
                "Unauthorized access attempt blocked | user_id=%s | username=@%s | allowed_in_db=%s",
                telegram_id,
                username,
                allowed_list,
            )
            # Emit explicit terminal alert log with instructions on how to whitelist user
            print(
                f"\n[SECURITY ALERT] Unauthorized Telegram user blocked!\n"
                f"  - Telegram User ID : {telegram_id}\n"
                f"  - Telegram Username: @{username if username else 'N/A'}\n"
                f"  - Whitelist in DB  : {allowed_list}\n"
                f"To allow this user, add Telegram ID '{telegram_id}' or username '{username}' to Whitelisted Customers in Admin Panel or DB.\n"
            )
            lang = context.user_data.get("lang", "EN")
            unauth_msg = t("unauthorized", lang)
            if update.callback_query:
                await update.callback_query.answer(unauth_msg, show_alert=True)
            elif update.message:
                await update.message.reply_text(unauth_msg)
            return

        return await func(update, context, *args, **kwargs)
    return wrapper

