from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    order_no: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True, index=True)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("telegram_groups.id"), nullable=True, index=True)
    slot_id: Mapped[int | None] = mapped_column(ForeignKey("slot_rows.id"), nullable=True, index=True)

    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    premium: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    premium_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="COMPLETED", index=True)

    telegram_user_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    slot_date_str: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    customer: Mapped["Customer | None"] = relationship("Customer")
    group: Mapped["TelegramGroup | None"] = relationship("TelegramGroup")
    slot: Mapped["SlotRow | None"] = relationship("SlotRow")
