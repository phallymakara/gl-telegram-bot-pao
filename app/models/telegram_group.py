from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class TelegramGroup(Base):
    __tablename__ = "telegram_groups"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    telegram_group_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    group_name: Mapped[str] = mapped_column(String(150), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)