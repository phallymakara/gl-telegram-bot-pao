"""
Customer Deposit Database Model Entity.
Stores customer cash and bank deposits, payment slip receipts, verification status, and audit logs.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Deposit(Base):
    """
    SQLAlchemy ORM model representing customer money deposits.
    Stores transaction ID (DEP-XXXXXXXX), amount, payment method (BANK/CASH),
    payment slip receipt photo attachment, customer reference, and approval status.
    """
    __tablename__ = "deposits"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    deposit_no: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True, index=True)
    telegram_user_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    username: Mapped[str | None] = mapped_column(String(100), nullable=True)

    account_name: Mapped[str] = mapped_column(String(150), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)

    payment_method: Mapped[str] = mapped_column(String(50), nullable=False, default="BANK")
    receipt_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    telegram_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING", index=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    customer: Mapped["Customer | None"] = relationship("Customer")
