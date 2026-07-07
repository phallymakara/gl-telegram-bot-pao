from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class SlotTable(Base):
    __tablename__ = "slot_tables"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    table_name: Mapped[str] = mapped_column(String(150), nullable=False)
    stock: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, default=0)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    rows: Mapped[list["SlotRow"]] = relationship(
        "SlotRow",
        back_populates="slot_table",
        cascade="all, delete-orphan",
    )