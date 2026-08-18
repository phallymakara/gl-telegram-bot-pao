"""
Customer & Whitelist Database Model Entity.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class Customer(Base):
    """
    SQLAlchemy ORM model representing master data customers and whitelisted Telegram users.
    Stores customer code, name, contact info, sex, DOB, nation, status, and Telegram metadata.
    """
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    customer_code: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    contact: Mapped[str | None] = mapped_column(String(150), nullable=True)
    sex: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dob: Mapped[str | None] = mapped_column(String(50), nullable=True)
    nation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    telegram_user_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    username: Mapped[str | None] = mapped_column(String(100), nullable=True)

    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)