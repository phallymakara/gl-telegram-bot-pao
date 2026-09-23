"""
Admin User Database Model Entity.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    """
    SQLAlchemy ORM model representing admin platform users.
    Stores username, bcrypt password hash, role (e.g. ADMIN), active flag status,
    and allowed sidebar modules list.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[str] = mapped_column(String(50), nullable=False, default="ADMIN")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    allowed_modules: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)

    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)