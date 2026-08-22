"""
Delivery Payment Collection Database Model Entity.
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class DeliveryPayment(Base):
    """
    SQLAlchemy ORM model representing individual payment collection events against a Delivery Note.
    Maintains an immutable historical audit log of collections without overwriting previous payments.
    """
    __tablename__ = "delivery_payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    delivery_note_id: Mapped[int] = mapped_column(
        ForeignKey("delivery_notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    collected_by: Mapped[str] = mapped_column(String(100), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False, default="CASH")  # CASH, BANK_TRANSFER, CHECK, TELEGRAM, OTHER
    reference_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    delivery_note: Mapped["DeliveryNote"] = relationship("DeliveryNote", back_populates="payments")
