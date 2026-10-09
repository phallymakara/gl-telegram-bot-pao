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
from app.services.settings_service import (
    get_bank_qr_settings_sync,
    get_settings_dict_sync,
    save_settings_dict_sync,
)

router = APIRouter()

UPLOADS_POSTERS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "posters"
UPLOADS_POSTERS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_BANK_QR_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "bank_qr"
UPLOADS_BANK_QR_DIR.mkdir(parents=True, exist_ok=True)
MAX_POSTER_SIZE = 10 * 1024 * 1024  # 10MB


class BotSettings(BaseModel):
    """Schema for bot configuration parameters."""
    bot_token: str = ""
    bot_username: str = "GoldSystemBot"
    sales_telegram_username: str = "phallymakara"
    sales_phone_number: str = "+85589804659"


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


class BankQrItem(BaseModel):
    """Schema for an individual bank QR image item."""
    url: str
    enabled: bool = True


class BankQrSettings(BaseModel):
    """Schema for bank account QR image auto-reply on deposit."""
    items: List[BankQrItem] = []
    image_urls: List[str] = []
    enabled: bool = True
    caption: str = ""


from pydantic import BaseModel, Field


class PaymentMethodToggles(BaseModel):
    bank: bool = True
    cheque: bool = True
    cash: bool = True


class PaymentMethodsSettings(BaseModel):
    deposit: PaymentMethodToggles = Field(default_factory=PaymentMethodToggles)
    withdrawal: PaymentMethodToggles = Field(default_factory=lambda: PaymentMethodToggles(bank=True, cheque=False, cash=True))


class SettingsResponse(BaseModel):
    """Schema aggregating all system settings domains."""
    bot: BotSettings
    security: SecuritySettings
    system: SystemSettings
    bank_qr: BankQrSettings = BankQrSettings()
    payment_methods: PaymentMethodsSettings = Field(default_factory=PaymentMethodsSettings)


@router.get("/", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """
    Retrieve global system settings configuration.
    Returns currently stored bot, security, system, bank_qr, and payment_methods parameters from database.
    """
    store = get_settings_dict_sync(db)
    bank_qr_data = get_bank_qr_settings_sync(db)
    pm_store = store.get("payment_methods", {})
    return SettingsResponse(
        bot=BotSettings(**store.get("bot", {})),
        security=SecuritySettings(**store.get("security", {})),
        system=SystemSettings(**store.get("system", {})),
        bank_qr=BankQrSettings(
            items=[BankQrItem(**it) for it in bank_qr_data.get("items", [])],
            image_urls=bank_qr_data.get("image_urls", []),
            enabled=bank_qr_data.get("enabled", True),
            caption=bank_qr_data.get("caption", ""),
        ),
        payment_methods=PaymentMethodsSettings(
            deposit=PaymentMethodToggles(**pm_store.get("deposit", {})),
            withdrawal=PaymentMethodToggles(**pm_store.get("withdrawal", {})),
        ),
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
        "bank_qr": body.bank_qr.model_dump() if body.bank_qr else {"enabled": False, "image_urls": [], "caption": ""},
        "payment_methods": body.payment_methods.model_dump() if body.payment_methods else {"deposit": {"bank": True, "cheque": True, "cash": True}, "withdrawal": {"bank": True, "cheque": False, "cash": True}},
    }
    save_settings_dict_sync(payload, db)
    return body


@router.put("/payment-methods", response_model=PaymentMethodsSettings)
def update_payment_methods(body: PaymentMethodsSettings, db: Session = Depends(get_db)):
    """
    Update payment method toggle settings for deposit and withdrawal immediately.
    """
    store = get_settings_dict_sync(db)
    store["payment_methods"] = body.model_dump()
    save_settings_dict_sync(store, db)
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


class UpdatePostersRequest(BaseModel):
    urls: List[str] = []


@router.put("/posters")
def update_posters(body: UpdatePostersRequest, db: Session = Depends(get_db)):
    """
    Directly update and persist off-store announcement poster URLs in real time.
    """
    store = get_settings_dict_sync(db)
    system = store.get("system", {})
    system["off_store_image_urls"] = body.urls
    system["off_store_image_url"] = body.urls[0] if body.urls else ""
    save_settings_dict_sync({"system": system}, db)
    return {"status": "success", "urls": body.urls}


class UpdateScheduleRequest(BaseModel):
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    off_store_message: Optional[str] = None


@router.put("/schedule")
def update_schedule(body: UpdateScheduleRequest, db: Session = Depends(get_db)):
    """
    Directly update and persist operating hours and off-store message in real time.
    """
    store = get_settings_dict_sync(db)
    system = store.get("system", {})
    if body.open_time is not None:
        system["open_time"] = body.open_time
    if body.close_time is not None:
        system["close_time"] = body.close_time
    if body.off_store_message is not None:
        system["off_store_message"] = body.off_store_message
    save_settings_dict_sync({"system": system}, db)
    return {"status": "success", "system": system}


def _process_bank_qr_upload(content: bytes, filename: str) -> str:
    ext = Path(filename or "bank_qr.jpg").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Invalid image type. Only JPG, PNG, and WebP are allowed.")

    if len(content) > MAX_POSTER_SIZE:
        raise HTTPException(status_code=400, detail="Bank QR image exceeds 10MB limit.")

    unique_name = f"bank_qr_{uuid.uuid4().hex[:10]}{ext}"
    dest_path = UPLOADS_BANK_QR_DIR / unique_name

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

    return f"/uploads/bank_qr/{unique_name}"


@router.post("/upload-bank-qr")
async def upload_bank_qr(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Upload one or more Bank QR images.
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
            url = _process_bank_qr_upload(content, item.filename or "bank_qr.jpg")
            saved_urls.append(url)

    first_url = saved_urls[0] if saved_urls else ""
    return {"urls": saved_urls, "url": first_url}


@router.delete("/bank-qr")
async def delete_bank_qr(body: Optional[DeletePosterRequest] = None, url: Optional[str] = None):
    """
    Remove physical Bank QR file from disk if it belongs to /uploads/bank_qr.
    """
    target_url = (body.url if body else None) or url or ""
    if target_url and target_url.startswith("/uploads/bank_qr/"):
        filename = target_url.replace("/uploads/bank_qr/", "", 1)
        target = (UPLOADS_BANK_QR_DIR / filename).resolve()
        if target.is_file() and str(target).startswith(str(UPLOADS_BANK_QR_DIR.resolve())):
            try:
                target.unlink(missing_ok=True)
            except Exception:
                pass
    return {"status": "success"}


class UpdateBankQrRequest(BaseModel):
    items: List[BankQrItem] = []


@router.put("/bank-qr")
def update_bank_qr(body: UpdateBankQrRequest, db: Session = Depends(get_db)):
    """
    Directly update and persist Bank QR items in real time.
    Ensures at least one Bank QR item remains active if items exist.
    """
    store = get_settings_dict_sync(db)
    items_dump = [it.model_dump() for it in body.items]
    active_urls = [it.url for it in body.items if it.enabled]
    if body.items and not active_urls:
        raise HTTPException(
            status_code=400,
            detail="At least one Bank QR code must remain active."
        )
    payload = {
        "items": items_dump,
        "image_urls": [it.url for it in body.items],
        "enabled": len(active_urls) > 0,
        "caption": store.get("bank_qr", {}).get("caption", ""),
    }
    save_settings_dict_sync({"bank_qr": payload}, db)
    return {"status": "success", "items": payload["items"]}


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



