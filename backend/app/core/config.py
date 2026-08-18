"""
Application Environment Configuration.
Loads system environment variables (.env file) including database URL, Telegram bot token, JWT secrets, and default gold pricing constants.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot API token configuration
BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set in environment")

# PostgreSQL Database URL configuration with Heroku/Railway scheme fixup
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/gold_bot_db"
)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Secret Key configuration for JWT authorization token signing
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not set in environment")

# JWT Token Signing Parameters
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Default Business Parameters
DEFAULT_GROUP_NAME = os.getenv("DEFAULT_GROUP_NAME", "Telegram Bot")
DEFAULT_SPOT_PRICE = "4376.20"
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG").upper()

