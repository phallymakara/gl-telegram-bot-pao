"""
System Settings API routes.
Provides endpoints for retrieving and updating global bot, security, and trading system operational parameters.
"""

import os
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.services.settings_service import get_settings_dict_sync, save_settings_dict_sync

router = APIRouter()

UPLOADS_POSTERS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "posters"
UPLOADS_POSTERS_DIR.mkdir(parents=True, exist_ok=True)
MAX_POSTER_SIZE = 10 * 1024 * 1024  # 10MB


class BotSettings(BaseModel):
    """Schema for bot configuration parameters."""
    bot_token: str = ""
    bot_username: str = "GoldSystemBot"


class SecuritySettings(BaseModel):
    """Schema for security policies and session timeouts."""
    session_timeout: int = 30
    password_expiry: int = 90
    two_factor: bool = False


class SystemSettings(BaseModel):
    """Schema for trading operating hours and off-store customer auto-reply."""
    open_time: str = "08:00"
    close_time: str = "21:00"
    off_store_message: str = ""
    off_store_image_url: str = ""
    off_store_image_urls: List[str] = []


class SettingsResponse(BaseModel):
    """Schema aggregating all system settings domains."""
    bot: BotSettings
    security: SecuritySettings
    system: SystemSettings


@router.get("/", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """
    Retrieve global system settings configuration.
    Returns currently stored bot, security, and system operational parameters from database.
    """
    store = get_settings_dict_sync(db)
    return SettingsResponse(
        bot=BotSettings(**store.get("bot", {})),
        security=SecuritySettings(**store.get("security", {})),
        system=SystemSettings(**store.get("system", {})),
    )


@router.put("/", response_model=SettingsResponse)
def update_settings(body: SettingsResponse, db: Session = Depends(get_db)):
    """
    Update global system settings configuration in database.
    """
    payload = {
        "bot": body.bot.model_dump(),
        "security": body.security.model_dump(),
        "system": body.system.model_dump(),
    }
    save_settings_dict_sync(payload, db)
    return body


class DeletePosterRequest(BaseModel):
    url: str


def _process_image_upload(content: bytes, filename: str) -> str:
    ext = Path(filename or "poster.jpg").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Invalid image type. Only JPG, PNG, and WebP are allowed.")

    if len(content) > MAX_POSTER_SIZE:
        raise HTTPException(status_code=400, detail="Poster image exceeds 10MB limit.")

    unique_name = f"poster_{uuid.uuid4().hex[:10]}{ext}"
    dest_path = UPLOADS_POSTERS_DIR / unique_name

    with open(dest_path, "wb") as f:
        f.write(content)

    try:
        with Image.open(dest_path) as img:
            if img.width > 1920 or img.height > 1920:
                img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                if ext in [".jpg", ".jpeg"]:
                    img.save(dest_path, "JPEG", quality=85, optimize=True)
                elif ext == ".png":
                    img.save(dest_path, "PNG", optimize=True)
                elif ext == ".webp":
                    img.save(dest_path, "WEBP", quality=85)
    except Exception:
        pass

    return f"/uploads/posters/{unique_name}"


@router.post("/upload-poster")
async def upload_poster(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Upload one or more off-store announcement poster images.
    Supports single or batch file uploads.
    """
    items_to_process = []
    if files:
        items_to_process.extend(files)
    if file:
        items_to_process.append(file)

    if not items_to_process:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    saved_urls = []
    for item in items_to_process:
        content = await item.read()
        if content:
            url = _process_image_upload(content, item.filename or "poster.jpg")
            saved_urls.append(url)

    first_url = saved_urls[0] if saved_urls else ""
    return {"urls": saved_urls, "url": first_url}


@router.delete("/poster")
async def delete_poster(body: Optional[DeletePosterRequest] = None, url: Optional[str] = None):
    """
    Remove physical poster file from disk if it belongs to /uploads/posters.
    """
    target_url = (body.url if body else None) or url or ""
    if target_url and target_url.startswith("/uploads/posters/"):
        filename = target_url.replace("/uploads/posters/", "", 1)
        target = (UPLOADS_POSTERS_DIR / filename).resolve()
        if target.is_file() and str(target).startswith(str(UPLOADS_POSTERS_DIR.resolve())):
            try:
                target.unlink(missing_ok=True)
            except Exception:
                pass
    return {"status": "success"}


@router.post("/broadcast-notice")
async def broadcast_notice():
    """
    Broadcast the configured off-store announcement message and poster images to all registered customers.
    """
    from app.core.config import BOT_TOKEN
    from app.bot.notice_service import broadcast_off_store_notice
    from telegram import Bot

    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="BOT_TOKEN is not configured in environment")

    try:
        bot = Bot(token=BOT_TOKEN)
        sent = await broadcast_off_store_notice(bot)
        return {
            "success": True,
            "sent_count": sent,
            "message": f"Successfully dispatched off-store announcement to {sent} registered customer(s).",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to broadcast off-store notice: {e}")



