"""
System Setting Database Model Entity.
Stores global system configuration, operating hours, and security parameters.
"""

from datetime import datetime
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class SystemSetting(Base):
    """
    SQLAlchemy ORM model representing global system settings (key-value pairs).
    Used to synchronize operating hours and trading schedules across API and Telegram bot.
    """
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
