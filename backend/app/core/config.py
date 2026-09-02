"""
Application Environment Configuration.
Loads system environment variables (.env.development, .env.production, or .env)
including database URL, Telegram bot token, JWT secrets, and default parameters.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Base project directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Step 1: Detect ENVIRONMENT if set in system or default to 'development'
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Step 2: Load specific environment file (.env.development / .env.production) if present
env_file = BASE_DIR / f".env.{ENVIRONMENT}"
if env_file.exists():
    load_dotenv(dotenv_path=env_file, override=True)
else:
    # Fallback to standard .env
    default_env = BASE_DIR / ".env"
    if default_env.exists():
        load_dotenv(dotenv_path=default_env, override=False)

# Re-read ENVIRONMENT and LOG_LEVEL after loading dotenv
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG" if ENVIRONMENT == "development" else "INFO").upper()

# Telegram Bot API token configuration
BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set in environment")

# PostgreSQL Database URL configuration
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", os.getenv("POSTGRES_SERVER", "localhost"))
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "gold_bot_db")

DEFAULT_DB_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
DATABASE_URL = os.getenv("DATABASE_URL") or DEFAULT_DB_URL
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