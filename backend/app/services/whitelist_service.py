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
from app.services.settings_service import get_allowed_group_id_sync
from app.utils.translation import t

logger = logging.getLogger(__name__)

# Short-lived in-memory cache for customer whitelist queries (5 seconds TTL)
_cached_users = set()
_last_fetch_time = 0
_cached_allowed_groups = None
_last_group_fetch_time = 0
CACHE_TTL = 5


async def get_allowed_groups_cached(force_refresh=False) -> set[str]:
    """
    Retrieve set of configured allowed Telegram Group IDs from settings.
    Caches result for 5 seconds to minimize database queries.
    """
    global _cached_allowed_groups, _last_group_fetch_time
    current_time = time.time()
    if not force_refresh and _cached_allowed_groups is not None and (current_time - _last_group_fetch_time < CACHE_TTL):
        return _cached_allowed_groups
    try:
        raw_str = await asyncio.to_thread(get_allowed_group_id_sync)
        if raw_str:
            groups = {g.strip() for g in raw_str.split(",") if g.strip()}
        else:
            groups = set()
        _cached_allowed_groups = groups
        _last_group_fetch_time = current_time
    except Exception as e:
        logger.error("Failed to load allowed_group_id: %s", e)
        if _cached_allowed_groups is None:
            _cached_allowed_groups = set()
    return _cached_allowed_groups


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
            customers = session.query(Customer).filter(Customer.is_active == True).all()
            allowed = set()
            for c in customers:
                if c.telegram_user_id:
                    allowed.add(str(c.telegram_user_id).strip())
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
    Enforces Option B (Group + Whitelist):
    1. If allowed_group_id is set:
       - Strictly blocks personal (1-on-1 direct / DM) chats.
       - Ensures interaction is inside the authorized group chat.
       - Verifies active membership in the group.
    2. Verifies user authorization against customer whitelist in database.
    """
    @wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        user = update.effective_user
        if not user:
            return

        chat = update.effective_chat
        chat_type = chat.type if chat else "private"
        chat_id_str = str(chat.id) if chat else ""
        telegram_id = str(user.id)
        username = user.username or ""

        # Step 1: Check Group Restriction if configured
        allowed_groups = await get_allowed_groups_cached()
        if allowed_groups:
            # Block personal 1-on-1 direct chat
            if chat_type == "private":
                logger.warning(
                    "Blocked personal chat attempt | user_id=%s | username=@%s | allowed_groups=%s",
                    telegram_id, username, allowed_groups
                )
                lang = context.user_data.get("lang", "EN")
                group_msg = t("group_only_warning", lang)
                if update.callback_query:
                    await update.callback_query.answer(
                        "⚠️ This bot can only be used inside the official trading group.",
                        show_alert=True
                    )
                elif update.message:
                    await update.message.reply_text(group_msg)
                return

            # Check if chat is inside the authorized group
            if chat_type in ("group", "supergroup"):
                if chat_id_str not in allowed_groups:
                    logger.warning(
                        "Blocked access in unauthorized group | chat_id=%s | allowed_groups=%s",
                        chat_id_str, allowed_groups
                    )
                    # Stay completely silent in unauthorized groups
                    return

                # Verify user's actual group membership via Telegram API
                try:
                    member = await context.bot.get_chat_member(chat_id=chat.id, user_id=user.id)
                    if member.status in ("left", "kicked"):
                        logger.warning(
                            "User is not an active group member | user_id=%s | status=%s",
                            telegram_id, member.status
                        )
                        if update.callback_query:
                            await update.callback_query.answer(
                                "⚠️ You must be a member of the official trading group to use this bot.",
                                show_alert=True
                            )
                        return
                except Exception as ex:
                    logger.warning("Could not verify chat member status: %s", ex)

        # Step 2: Check Customer Whitelist in database
        allowed_list = await load_whitelist()
        clean_username = username.strip().lower().lstrip("@") if username else ""
        str_tg_id = str(telegram_id).strip()

        is_allowed = (clean_username and clean_username in allowed_list) or (str_tg_id in allowed_list)

        if not is_allowed:
            logger.warning(
                "Unauthorized access attempt blocked | user_id=%s | username=@%s | allowed_in_db=%s. To allow this user, add Telegram ID or username to Customers whitelist in Admin Panel.",
                telegram_id,
                username if username else "N/A",
                allowed_list,
            )
            lang = context.user_data.get("lang", "EN")
            unauth_msg = t("unauthorized", lang)
            if update.callback_query:
                # Show private popup alert only on that user's device without posting in group
                await update.callback_query.answer(unauth_msg, show_alert=True)
            elif update.message:
                is_group = bool(update.effective_chat and update.effective_chat.type in ("group", "supergroup"))
                if not is_group:
                    await update.message.reply_text(unauth_msg)
                # In groups: stay completely silent so unauthorized members cannot trigger any response
            return

        return await func(update, context, *args, **kwargs)
    return wrapper

