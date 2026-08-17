import os 
from dotenv import load_dotenv

load_dotenv()

# bot token configuration
BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set in environment")

# database url configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/gold_bot_db"
)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


# secret_key configuration
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not set in environment")

# algorithm
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# default business constants
DEFAULT_GROUP_NAME = os.getenv("DEFAULT_GROUP_NAME", "Telegram Bot")
DEFAULT_SPOT_PRICE = "4376.20"
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG").upper()
