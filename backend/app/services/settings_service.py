"""
System Settings & Operating Hours Service.
Manages persistent system configuration, trading schedules, and operating hours checks.
"""

import json
import logging
from datetime import datetime, time
from typing import Tuple

from app.core.database import SessionLocal
from app.models.system_setting import SystemSetting
from app.utils.helpers import get_cambodia_now

logger = logging.getLogger(__name__)

DEFAULT_SETTINGS = {
    "bot": {"bot_token": "", "bot_username": "GoldSystemBot"},
    "security": {"session_timeout": 30, "password_expiry": 90, "two_factor": False},
    "system": {
        "open_time": "08:00",
        "close_time": "21:00",
        "off_store_message": "",
        "off_store_image_url": "",
        "off_store_image_urls": [],
    },
    "bank_qr": {
        "items": [],
        "image_urls": [],
        "enabled": True,
        "caption": "",
    },
}


def get_settings_dict_sync(session=None) -> dict:
    """
    Retrieve all global settings from database with default fallbacks.
    """
    should_close = False
    if session is None:
        session = SessionLocal()
        should_close = True

    result = {k: dict(v) for k, v in DEFAULT_SETTINGS.items()}
    try:
        records = session.query(SystemSetting).all()
        for rec in records:
            if rec.key in result:
                try:
                    loaded = json.loads(rec.value)
                    if isinstance(loaded, dict):
                        result[rec.key].update(loaded)
                except Exception as e:
                    logger.warning("Failed to decode setting %s: %s", rec.key, e)
    except Exception as e:
        logger.error("Error reading system settings from database: %s", e)
    finally:
        if should_close:
            session.close()

    return result


def save_settings_dict_sync(data: dict, session=None) -> dict:
    """
    Persist settings dictionary into the database.
    """
    should_close = False
    if session is None:
        session = SessionLocal()
        should_close = True

    try:
        for key in ("bot", "security", "system", "bank_qr"):
            if key in data:
                payload = json.dumps(data[key])
                rec = session.query(SystemSetting).filter(SystemSetting.key == key).first()
                if rec:
                    rec.value = payload
                else:
                    rec = SystemSetting(key=key, value=payload)
                    session.add(rec)
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error("Failed to save system settings: %s", e)
    finally:
        if should_close:
            session.close()

    return get_settings_dict_sync()


def format_time_12h(time_str: str) -> str:
    """
    Format a 24-hour time string (e.g. '08:00' or '21:00') into 12-hour format ('08:00 AM' or '09:00 PM').
    """
    try:
        t = datetime.strptime(time_str.strip(), "%H:%M").time()
        return t.strftime("%I:%M %p")
    except Exception:
        return time_str


def get_operating_hours_sync(session=None) -> Tuple[str, str]:
    """
    Get operating open and close times as strings (e.g. ('08:00', '21:00')).
    """
    settings = get_settings_dict_sync(session)
    system_cfg = settings.get("system", {})
    open_time = system_cfg.get("open_time", "08:00")
    close_time = system_cfg.get("close_time", "21:00")
    return open_time, close_time


def is_within_operating_hours_sync(session=None) -> Tuple[bool, str, str]:
    """
    Check if the current time in Cambodia (ICT, UTC+7) falls within operating hours.
    Returns:
        (is_open: bool, open_display: str, close_display: str)
    """
    open_time_str, close_time_str = get_operating_hours_sync(session)
    open_display = format_time_12h(open_time_str)
    close_display = format_time_12h(close_time_str)

    try:
        open_parts = [int(p) for p in open_time_str.split(":")]
        close_parts = [int(p) for p in close_time_str.split(":")]
        open_t = time(open_parts[0], open_parts[1])
        close_t = time(close_parts[0], close_parts[1])

        current_t = get_cambodia_now().time()

        if open_t <= close_t:
            is_open = open_t <= current_t <= close_t
        else:
            # Handles overnight schedule
            is_open = current_t >= open_t or current_t <= close_t

        return is_open, open_display, close_display
    except Exception as e:
        logger.error("Error evaluating operating hours: %s", e)
        # Default to open if calculation fails
        return True, open_display, close_display


def get_off_store_notice_sync(session=None) -> dict:
    """
    Get current operating hours status, formatted displays, custom off-store text, and poster URLs.
    Returns:
        {
            "is_open": bool,
            "open_display": str,
            "close_display": str,
            "off_store_message": str,
            "off_store_image_url": str,
            "off_store_image_urls": list[str],
        }
    """
    settings = get_settings_dict_sync(session)
    system_cfg = settings.get("system", {})
    is_open, open_disp, close_disp = is_within_operating_hours_sync(session)

    image_urls = list(system_cfg.get("off_store_image_urls") or [])
    legacy_url = (system_cfg.get("off_store_image_url") or "").strip()
    if not image_urls and legacy_url:
        image_urls = [legacy_url]

    return {
        "is_open": is_open,
        "open_display": open_disp,
        "close_display": close_disp,
        "off_store_message": system_cfg.get("off_store_message", "") or "",
        "off_store_image_url": legacy_url or (image_urls[0] if image_urls else ""),
        "off_store_image_urls": image_urls,
    }


def get_bank_qr_settings_sync(session=None) -> dict:
    """
    Retrieve Bank QR settings with individual item states (url, enabled).
    """
    settings = get_settings_dict_sync(session)
    bank_qr_cfg = settings.get("bank_qr", {})

    items = []
    raw_items = bank_qr_cfg.get("items")
    if isinstance(raw_items, list) and raw_items:
        for it in raw_items:
            if isinstance(it, dict) and it.get("url"):
                items.append({
                    "url": str(it.get("url", "")).strip(),
                    "enabled": bool(it.get("enabled", True)),
                })
            elif isinstance(it, str) and it.strip():
                items.append({"url": it.strip(), "enabled": True})
    elif bank_qr_cfg.get("image_urls"):
        for u in bank_qr_cfg.get("image_urls", []):
            if u and str(u).strip():
                items.append({
                    "url": str(u).strip(),
                    "enabled": bool(bank_qr_cfg.get("enabled", True)),
                })

    active_urls = [it["url"] for it in items if it.get("enabled", True) and it.get("url")]

    return {
        "items": items,
        "active_image_urls": active_urls,
        "image_urls": [it["url"] for it in items],
        "enabled": len(active_urls) > 0,
        "caption": str(bank_qr_cfg.get("caption", "") or ""),
    }

