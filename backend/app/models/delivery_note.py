"""
Delivery Note and Payment Collection Database Model Entities.
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class DeliveryNote(Base):
    """
    SQLAlchemy ORM model representing customer Delivery Notes.
    Tracks delivered goods/gold, amounts owed, total payments collected, outstanding balance,
    and automatic payment statuses (WAITING_PAYMENT, PARTIALLY_PAID, PAID).
    """
    __tablename__ = "delivery_notes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    delivery_no: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    # Foreign key to customer sale order (allows multiple DOs for partial deliveries)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True, index=True)

    customer_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    recipient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    delivery_address: Mapped[str] = mapped_column(Text, nullable=False)
    driver_contact: Mapped[str | None] = mapped_column(String(100), nullable=True)
    goods_delivered: Mapped[str | None] = mapped_column(String(255), nullable=True)

    gold_quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    amount_owed: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    outstanding_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Payment status: WAITING_PAYMENT | PARTIALLY_PAID | PAID
    payment_status: Mapped[str] = mapped_column(String(30), nullable=False, default="WAITING_PAYMENT", index=True)

    # Courier status: Dispatched | In Transit | Delivered
    courier_status: Mapped[str] = mapped_column(String(30), nullable=False, default="Dispatched", index=True)

    dispatch_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    order: Mapped["Order"] = relationship("Order")
    customer: Mapped["Customer | None"] = relationship("Customer")
    payments: Mapped[list["DeliveryPayment"]] = relationship(
        "DeliveryPayment",
        back_populates="delivery_note",
        cascade="all, delete-orphan",
        order_by="DeliveryPayment.payment_date.desc(), DeliveryPayment.id.desc()",
    )
