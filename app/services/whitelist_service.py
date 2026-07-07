import asyncio
import time
import logging
from functools import wraps
from telegram import Update
from telegram.ext import ContextTypes
import gspread

from app.services.google_client import spreadsheet
from app.utils.translation import t

logger = logging.getLogger(__name__)

# Cache configuration
_cached_users = set()
_last_fetch_time = 0
CACHE_TTL = 300  # 5 minutes in seconds
MAX_USERS = 2000  # Cap whitelist size to limit memory consumption

def get_whitelist_sheet():
    try:
        return spreadsheet.worksheet("Whitelist")
    except gspread.exceptions.WorksheetNotFound:
        # Auto-create the Whitelist worksheet if it doesn't exist
        sheet = spreadsheet.add_worksheet(title="Whitelist", rows="100", cols="2")
        sheet.append_row(["username", "telegram_id"])
        return sheet

async def load_whitelist(force_refresh=False) -> set:
    global _cached_users, _last_fetch_time
    current_time = time.time()
    
    if not force_refresh and (current_time - _last_fetch_time < CACHE_TTL):
        return _cached_users
        
    try:
        sheet = get_whitelist_sheet()
        records = await asyncio.to_thread(sheet.get_all_records)
        
        allowed = set()
        # Cap to MAX_USERS to guarantee memory stays low
        for row in records[:MAX_USERS]:
            username = str(row.get("username", "")).strip().lower().lstrip("@")
            if username:
                allowed.add(username)
                
            telegram_id = str(row.get("telegram_id", "")).strip()
            if telegram_id:
                allowed.add(telegram_id)
                
        _cached_users = allowed
        _last_fetch_time = current_time
        logger.info("Whitelist loaded/refreshed: %d allowed targets", len(_cached_users))
    except Exception as e:
        logger.error("Failed to load whitelist from Google Sheets: %s", e)
        # Keep old cache on error to keep the bot functioning
        
    return _cached_users

async def is_user_allowed(username: str, telegram_id: str) -> bool:
    allowed_list = await load_whitelist()
    
    clean_username = username.strip().lower().lstrip("@") if username else ""
    str_tg_id = str(telegram_id).strip()
    
    return (clean_username in allowed_list) or (str_tg_id in allowed_list)

def restricted(func):
    """
    Decorator for handlers to restrict access to whitelisted users.
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
        
        if not ((clean_username in allowed_list) or (str_tg_id in allowed_list)):
            logger.warning(
                "Unauthorized access attempt blocked | user_id=%s | username=%s",
                telegram_id,
                username,
            )
            
            lang = context.user_data.get("lang", "EN")
            unauth_msg = t("unauthorized", lang)
            
            # Respond appropriately depending on update type
            if update.callback_query:
                # For buttons, show alert popup
                await update.callback_query.answer(unauth_msg, show_alert=True)
            elif update.message:
                # For text/commands, reply to the message
                await update.message.reply_text(unauth_msg)
            return
            
        # Automatically populate the telegram ID in the Whitelist sheet if it's missing from the whitelist cache
        if str_tg_id not in allowed_list:
            populate_telegram_id_if_blank(username, telegram_id)
        
        return await func(update, context, *args, **kwargs)
    return wrapper

def _sync_populate_telegram_id_if_blank(username: str, telegram_id: str):
    if not username:
        return
    
    clean_username = username.strip().lower().lstrip("@")
    str_tg_id = str(telegram_id).strip()
    
    try:
        sheet = get_whitelist_sheet()
        records = sheet.get_all_records()
        
        for idx, row in enumerate(records, start=2):
            sheet_username = str(row.get("username", "")).strip().lower().lstrip("@")
            sheet_tg_id = str(row.get("telegram_id", "")).strip()
            
            if sheet_username == clean_username and not sheet_tg_id:
                sheet.update(f"B{idx}", [[str_tg_id]])
                logger.info("Automatically populated telegram_id for user %s -> %s on row %d", username, telegram_id, idx)
                load_whitelist(force_refresh=True)
                break
    except Exception as e:
        logger.error("Failed to populate telegram_id for %s: %s", username, e)

def populate_telegram_id_if_blank(username: str, telegram_id: str):
    asyncio.create_task(asyncio.to_thread(_sync_populate_telegram_id_if_blank, username, telegram_id))
