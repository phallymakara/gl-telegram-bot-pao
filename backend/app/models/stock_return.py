from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class StockReturn(Base):
    __tablename__ = "stock_returns"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    return_no: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    return_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # "PO_RETURN" | "CUSTOMER_RETURN" | "ORDER_CANCEL"

    purchase_order_id: Mapped[int | None] = mapped_column(ForeignKey("purchase_orders.id"), nullable=True, index=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True, index=True)
    slot_table_id: Mapped[int | None] = mapped_column(ForeignKey("slot_tables.id", ondelete="SET NULL"), nullable=True, index=True)

    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    purchase_order: Mapped["PurchaseOrder | None"] = relationship("PurchaseOrder")
    order: Mapped["Order | None"] = relationship("Order")
    slot_table: Mapped["SlotTable"] = relationship("SlotTable")
    creator: Mapped["User | None"] = relationship("User")
