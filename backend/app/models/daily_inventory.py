"""
Daily Vault Inventory Audit Database Model Entity.
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class DailyInventory(Base):
    """
    SQLAlchemy ORM model representing manual daily physical vault stock inventory audit entries.
    Stores unique inventory_date, physical gold balance (kg), and timestamps.
    """
    __tablename__ = "daily_inventory"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    inventory_date: Mapped[date] = mapped_column(Date, nullable=False, index=True, unique=True)
    stock_kg: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

