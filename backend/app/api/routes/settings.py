"""
System Settings API routes.
Provides endpoints for retrieving and updating global bot, security, and trading system operational parameters.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


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
    """Schema for trading operating hours."""
    open_time: str = "08:00"
    close_time: str = "21:00"


class SettingsResponse(BaseModel):
    """Schema aggregating all system settings domains."""
    bot: BotSettings
    security: SecuritySettings
    system: SystemSettings


# Default in-memory settings store initialization
_default = SettingsResponse(
    bot=BotSettings(),
    security=SecuritySettings(),
    system=SystemSettings(),
)

_store = {
    "bot": _default.bot.model_dump(),
    "security": _default.security.model_dump(),
    "system": _default.system.model_dump(),
}


@router.get("/", response_model=SettingsResponse)
def get_settings():
    """
    Retrieve global system settings configuration.
    Returns currently stored bot, security, and system operational parameters.
    """
    return SettingsResponse(
        bot=BotSettings(**_store.get("bot", {})),
        security=SecuritySettings(**_store.get("security", {})),
        system=SystemSettings(**_store.get("system", {})),
    )


@router.put("/", response_model=SettingsResponse)
def update_settings(body: SettingsResponse):
    """
    Update global system settings configuration.
    """
    _store["bot"] = body.bot.model_dump()
    _store["security"] = body.security.model_dump()
    _store["system"] = body.system.model_dump()
    return body

