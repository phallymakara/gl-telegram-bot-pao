from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter()


class BotSettings(BaseModel):
    bot_token: str = ""
    bot_username: str = "GoldSystemBot"


class SecuritySettings(BaseModel):
    session_timeout: int = 30
    password_expiry: int = 90
    two_factor: bool = False


class SystemSettings(BaseModel):
    open_time: str = "08:00"
    close_time: str = "21:00"


class SettingsResponse(BaseModel):
    bot: BotSettings
    security: SecuritySettings
    system: SystemSettings


_default = SettingsResponse(
    bot=BotSettings(),
    security=SecuritySettings(),
    system=SystemSettings(),
)

_store = dict(_default)


@router.get("/", response_model=SettingsResponse)
def get_settings():
    return SettingsResponse(
        bot=BotSettings(**_store.get("bot", {})),
        security=SecuritySettings(**_store.get("security", {})),
        system=SystemSettings(**_store.get("system", {})),
    )


@router.put("/", response_model=SettingsResponse)
def update_settings(body: SettingsResponse):
    _store["bot"] = body.bot.model_dump()
    _store["security"] = body.security.model_dump()
    _store["system"] = body.system.model_dump()
    return body
