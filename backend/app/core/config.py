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

# Step 1: Load base .env if present (allows local overrides)
default_env = BASE_DIR / ".env"
if default_env.exists():
    load_dotenv(dotenv_path=default_env, override=False)

# Step 2: Detect ENVIRONMENT if set in system or default to 'development'
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Step 3: Load specific environment file (.env.development / .env.production) if present
env_file = BASE_DIR / f".env.{ENVIRONMENT}"
if env_file.exists():
    load_dotenv(dotenv_path=env_file, override=False)

# Re-read ENVIRONMENT and LOG_LEVEL after loading dotenv
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG" if ENVIRONMENT == "development" else "INFO").upper()

# Telegram Bot API token configuration
BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set in environment")

# PostgreSQL Database URL configuration (loaded strictly from environment)
POSTGRES_USER = os.getenv("POSTGRES_USER", "")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", os.getenv("POSTGRES_SERVER", ""))
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if not all([POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_DB]):
        raise RuntimeError(
            "DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_HOST/POSTGRES_DB must be set in environment"
        )
    DATABASE_URL = (
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    )

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Secret Key configuration for JWT authorization token signing
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not set in environment")

# JWT Token Signing Parameters
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Environment-Configured Business & Contact Defaults
DEFAULT_GROUP_NAME = os.getenv("DEFAULT_GROUP_NAME", "Telegram Bot")
DEFAULT_SPOT_PRICE = os.getenv("DEFAULT_SPOT_PRICE", "0")
DEFAULT_PREMIUM = os.getenv("DEFAULT_PREMIUM", "0")

BOT_USERNAME = os.getenv("BOT_USERNAME", "")
SALES_TELEGRAM_USERNAME = os.getenv("SALES_TELEGRAM_USERNAME", "")
SALES_PHONE_NUMBER = os.getenv("SALES_PHONE_NUMBER", "")
SALES_PHONE_DISPLAY = os.getenv("SALES_PHONE_DISPLAY", "")

# Bootstrap Super Admin configuration (used only for explicit seeding/bootstrap scripts)
DEFAULT_ADMIN_NAME = os.getenv("DEFAULT_ADMIN_NAME", "Super Admin")
DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "")
DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "")