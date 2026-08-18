"""
Supplier Purchase Order Database Model Entity.
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.stock_return import StockReturn
from app.models.supplier import Supplier


class PurchaseOrder(Base):
    """
    SQLAlchemy ORM model representing supplier gold purchase orders (LOCAL, OVERSEA, or BUYBACK).
    Tracks ordered physical gold quantity (kg), unit cost, shipping/tracking info for overseas POs, and receipt status.
    """
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    po_no: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    po_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # "LOCAL" | "OVERSEA" | "BUYBACK"

    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True, index=True)
    supplier_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    slot_table_id: Mapped[int | None] = mapped_column(ForeignKey("slot_tables.id"), nullable=True, index=True)

    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    spot_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    premium: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT", index=True)

    order_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expected_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    received_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Oversea-only fields — left null for LOCAL purchase orders.
    shipping_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tracking_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    customs_fee: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    port_of_origin: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    supplier: Mapped["Supplier | None"] = relationship("Supplier")
    slot_table: Mapped["SlotTable | None"] = relationship("SlotTable")
    creator: Mapped["User | None"] = relationship("User")

