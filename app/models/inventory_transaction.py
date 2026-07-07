from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    slot_table_id: Mapped[int] = mapped_column(ForeignKey("slot_tables.id"), nullable=False, index=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True, index=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)

    stock_before: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    stock_after: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)

    remark: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    slot_table: Mapped["SlotTable"] = relationship("SlotTable")
    order: Mapped["Order | None"] = relationship("Order")
    creator: Mapped["User | None"] = relationship("User")