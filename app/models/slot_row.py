from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class SlotRow(Base):
    __tablename__ = "slot_rows"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    slot_table_id: Mapped[int] = mapped_column(
        ForeignKey("slot_tables.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    slot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    premium: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    slot_table: Mapped["SlotTable"] = relationship("SlotTable", back_populates="rows")