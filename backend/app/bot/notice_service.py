"""
Off-Store Notice & Announcement Dispatcher Service.
Sends configured text or poster announcement to customers outside trading hours.
Supports single photos, multi-image media group albums, and automated close-time scheduling.
"""

import asyncio
import logging
from pathlib import Path
from typing import List, Union

from telegram import InputMediaPhoto
from telegram.error import Forbidden, TelegramError

from app.bot.keyboards import build_closed_hours_keyboard
from app.core.database import SessionLocal
from app.models.customer import Customer
from app.services.settings_service import get_off_store_notice_sync, get_operating_hours_sync
from app.utils.helpers import get_cambodia_now
from app.utils.translation import t

logger = logging.getLogger(__name__)


def _resolve_photo_source(url: str) -> Union[Path, str]:
    """Resolve a relative or absolute URL to a local filesystem Path if available, else return URL string."""
    url_clean = str(url).strip()
    if "/uploads/" in url_clean:
        rel_file = url_clean.split("/uploads/", 1)[1]
        uploads_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
        candidate = uploads_dir / rel_file
        if candidate.exists():
            return candidate
    candidate_path = Path(url_clean)
    if candidate_path.is_file() and candidate_path.exists():
        return candidate_path
    return url_clean


async def send_off_store_notice(message_target, lang: str = "EN", is_order_reject: bool = False) -> None:
    """
    Send off-store auto-reply notice to a customer replying directly to their message.
    - If multiple poster images are configured, sends photo album (media group) followed by keyboard.
    - If a single poster is configured, sends photo with caption and keyboard.
    - Otherwise sends text notice.
    """
    notice_data = await asyncio.to_thread(get_off_store_notice_sync)
    open_disp = notice_data.get("open_display", "08:00 AM")
    close_disp = notice_data.get("close_display", "09:00 PM")
    custom_text = notice_data.get("off_store_message", "").strip()

    image_urls: List[str] = [
        u.strip() for u in notice_data.get("off_store_image_urls", []) if u and u.strip()
    ]
    if not image_urls:
        single_url = (notice_data.get("off_store_image_url") or "").strip()
        if single_url:
            image_urls = [single_url]

    if custom_text:
        msg = custom_text
    else:
        translation_key = "closed_order_rejected" if is_order_reject else "closed_hours"
        msg = t(translation_key, lang).format(
            open_time=open_disp,
            close_time=close_disp,
        )

    keyboard = build_closed_hours_keyboard(lang)

    # 1. Single poster image
    if len(image_urls) == 1:
        resolved = _resolve_photo_source(image_urls[0])
        try:
            if isinstance(resolved, Path):
                with open(resolved, "rb") as photo_f:
                    await message_target.reply_photo(
                        photo=photo_f,
                        caption=msg[:1024],
                        reply_markup=keyboard,
                    )
            else:
                await message_target.reply_photo(
                    photo=resolved,
                    caption=msg[:1024],
                    reply_markup=keyboard,
                )
            return
        except Exception as e:
            logger.error("Failed to reply with single poster photo: %s", e)

    # 2. Multiple poster images (media group album)
    elif len(image_urls) > 1:
        file_handles = []
        try:
            media_items = []
            for idx, u in enumerate(image_urls[:10]):  # Telegram max 10 photos per group
                resolved = _resolve_photo_source(u)
                caption = msg[:1024] if idx == 0 else None
                if isinstance(resolved, Path):
                    f = open(resolved, "rb")
                    file_handles.append(f)
                    media_items.append(InputMediaPhoto(media=f, caption=caption))
                else:
                    media_items.append(InputMediaPhoto(media=resolved, caption=caption))

            if media_items:
                await message_target.reply_media_group(media=media_items)
                await message_target.reply_text(
                    text=f"{open_disp} - {close_disp}",
                    reply_markup=keyboard,
                )
                return
        except Exception as e:
            logger.error("Failed to reply with poster media group: %s", e)
        finally:
            for f in file_handles:
                try:
                    f.close()
                except Exception:
                    pass

    # 3. Fallback to text message
    try:
        await message_target.reply_text(
            text=msg,
            parse_mode="Markdown",
            reply_markup=keyboard,
        )
    except Exception:
        await message_target.reply_text(
            text=msg,
            reply_markup=keyboard,
        )


async def send_off_store_notice_to_chat(bot, chat_id: Union[str, int], lang: str = "EN") -> bool:
    """
    Send off-store auto-reply notice directly to a specific Telegram chat_id using Bot API.
    Used for automated broadcasts and direct push notifications.
    """
    notice_data = await asyncio.to_thread(get_off_store_notice_sync)
    open_disp = notice_data.get("open_display", "08:00 AM")
    close_disp = notice_data.get("close_display", "09:00 PM")
    custom_text = notice_data.get("off_store_message", "").strip()

    image_urls: List[str] = [
        u.strip() for u in notice_data.get("off_store_image_urls", []) if u and u.strip()
    ]
    if not image_urls:
        single_url = (notice_data.get("off_store_image_url") or "").strip()
        if single_url:
            image_urls = [single_url]

    msg = custom_text if custom_text else t("closed_hours", lang).format(
        open_time=open_disp,
        close_time=close_disp,
    )

    keyboard = build_closed_hours_keyboard(lang)

    # 1. Single poster image
    if len(image_urls) == 1:
        resolved = _resolve_photo_source(image_urls[0])
        try:
            if isinstance(resolved, Path):
                with open(resolved, "rb") as photo_f:
                    await bot.send_photo(
                        chat_id=chat_id,
                        photo=photo_f,
                        caption=msg[:1024],
                        reply_markup=keyboard,
                    )
            else:
                await bot.send_photo(
                    chat_id=chat_id,
                    photo=resolved,
                    caption=msg[:1024],
                    reply_markup=keyboard,
                )
            return True
        except Forbidden:
            logger.warning("Forbidden: Customer %s blocked the bot", chat_id)
            return False
        except TelegramError as e:
            logger.error("Failed to send single poster to %s: %s", chat_id, e)

    # 2. Multiple poster images (media group album)
    elif len(image_urls) > 1:
        file_handles = []
        try:
            media_items = []
            for idx, u in enumerate(image_urls[:10]):
                resolved = _resolve_photo_source(u)
                caption = msg[:1024] if idx == 0 else None
                if isinstance(resolved, Path):
                    f = open(resolved, "rb")
                    file_handles.append(f)
                    media_items.append(InputMediaPhoto(media=f, caption=caption))
                else:
                    media_items.append(InputMediaPhoto(media=resolved, caption=caption))

            if media_items:
                await bot.send_media_group(chat_id=chat_id, media=media_items)
                await bot.send_message(
                    chat_id=chat_id,
                    text=f"{open_disp} - {close_disp}",
                    reply_markup=keyboard,
                )
                return True
        except Forbidden:
            logger.warning("Forbidden: Customer %s blocked the bot", chat_id)
            return False
        except TelegramError as e:
            logger.error("Failed to send media group to %s: %s", chat_id, e)
        finally:
            for f in file_handles:
                try:
                    f.close()
                except Exception:
                    pass

    # 3. Fallback text
    try:
        await bot.send_message(
            chat_id=chat_id,
            text=msg,
            reply_markup=keyboard,
        )
        return True
    except Forbidden:
        logger.warning("Forbidden: Customer %s blocked the bot", chat_id)
        return False
    except TelegramError as e:
        logger.error("Failed to send text notice to %s: %s", chat_id, e)
        return False


async def broadcast_off_store_notice(bot) -> int:
    """
    Broadcast off-store notice & posters to all registered Telegram customers.
    Returns the count of successfully delivered messages.
    """
    session = SessionLocal()
    try:
        customers = session.query(Customer).all()
        user_ids = [c.telegram_user_id for c in customers if c.telegram_user_id]
    finally:
        session.close()

    if not user_ids:
        logger.info("No registered Telegram customers to broadcast off-store notice to.")
        return 0

    unique_ids = list(set(user_ids))
    sent_count = 0
    for tg_id in unique_ids:
        success = await send_off_store_notice_to_chat(bot, tg_id)
        if success:
            sent_count += 1
        # Prevent hitting Telegram rate limits (30 msg/sec global limit)
        await asyncio.sleep(0.05)

    logger.info("Broadcasted off-store notice to %d/%d customers", sent_count, len(unique_ids))
    return sent_count


async def store_close_scheduler_loop(application):
    """
    Continuous background loop that monitors store operating hours.
    When the store closing time configured in System Settings is reached,
    automatically broadcasts the off-store notice/poster to all registered customers.
    """
    logger.info("Store close automatic scheduler loop started")
    last_broadcast_date = ""

    while True:
        try:
            now = get_cambodia_now()
            today_str = now.strftime("%Y-%m-%d")
            current_time_str = now.strftime("%H:%M")

            _, close_time_str = get_operating_hours_sync()
            close_time_clean = close_time_str.strip()

            # Trigger broadcast once per day when current minute reaches close time
            if current_time_str == close_time_clean and last_broadcast_date != today_str:
                logger.info(
                    "Store close time (%s) reached in Cambodia! Automatically broadcasting off-store poster/notice...",
                    close_time_clean,
                )
                await broadcast_off_store_notice(application.bot)
                last_broadcast_date = today_str
        except Exception as e:
            logger.error("Error in store close scheduler loop: %s", e)

        # Check every 20 seconds to guarantee triggering during the close minute
        await asyncio.sleep(20)
