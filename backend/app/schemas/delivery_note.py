"""
Delivery Note and Payment Collection Pydantic DTO Schemas.
"""

from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class DeliveryPaymentCreate(BaseModel):
    """Schema for recording a new payment collection against a delivery note."""
    amount: Decimal = Field(gt=0, description="Payment collection amount in USD, must be greater than zero")
    payment_date: date = Field(default_factory=date.today, description="Date payment was collected")
    collected_by: str = Field(min_length=1, max_length=100, description="Staff member who collected payment")
    payment_method: str = Field(default="CASH", description="Payment method: CASH, BANK_TRANSFER, CHECK, TELEGRAM, OTHER")
    reference_note: str | None = Field(default=None, description="Optional payment reference or transaction note")


class DeliveryPaymentResponse(BaseModel):
    """Schema representing an individual payment collection record."""
    id: int
    delivery_note_id: int
    amount: Decimal
    payment_date: date
    collected_by: str
    payment_method: str
    reference_note: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DeliveryNoteCreate(BaseModel):
    """Schema for generating a Delivery Note from a completed customer sale order."""
    order_id: int
    recipient_name: str = Field(min_length=1, max_length=150)
    delivery_address: str = Field(min_length=1)
    driver_contact: str | None = None
    goods_delivered: str | None = None
    gold_quantity: Decimal | None = None
    amount_owed: Decimal | None = None
    collected_amount: Decimal | None = None
    dispatch_date: date | None = None
    courier_status: str = "Dispatched"
    notes: str | None = None


class DeliveryNoteUpdate(BaseModel):
    """Schema for updating delivery note details and courier status."""
    recipient_name: str | None = None
    delivery_address: str | None = None
    driver_contact: str | None = None
    courier_status: str | None = None
    dispatch_date: date | None = None
    notes: str | None = None


class DeliveryNoteResponse(BaseModel):
    """Schema representing a Delivery Note in list or summary view."""
    id: int
    delivery_no: str
    order_id: int
    order_no: str
    customer_id: int | None = None
    customer_name: str | None = None
    recipient_name: str
    delivery_address: str
    driver_contact: str | None = None
    goods_delivered: str | None = None
    gold_quantity: Decimal
    order_quantity: Decimal | None = None
    order_total_amount: Decimal | None = None
    amount_owed: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal
    payment_status: str
    courier_status: str
    dispatch_date: date | None = None
    notes: str | None = None
    created_at: datetime
    payments_count: int = 0
    order_is_fully_delivered: bool = False
    order_is_fully_paid: bool = False

    model_config = {"from_attributes": True}


class DeliveryNoteDetailResponse(DeliveryNoteResponse):
    """Schema representing a Delivery Note with full nested payment collection audit history."""
    payments: list[DeliveryPaymentResponse] = []


class EligibleOrderResponse(BaseModel):
    """Schema representing completed/delivered customer sales available for generating Delivery Notes."""
    id: int
    order_no: str
    customer_name: str | None = None
    quantity: Decimal  # Total ordered quantity
    dispatched_quantity: Decimal = Decimal("0.000")  # Already dispatched in existing DOs
    remaining_quantity: Decimal = Decimal("0.000")  # Remaining undelivered gold
    spot_price: Decimal | None = None
    premium: Decimal | None = None
    total_amount: Decimal | None = None
    transaction_type: str
    status: str
    created_at: datetime
    slot_date_str: str | None = None

    model_config = {"from_attributes": True}


class PartialDeliveryCalculationRequest(BaseModel):
    """Schema for requesting server-side formula calculation for partial gold delivery."""
    order_id: int
    dispatch_quantity: Decimal = Field(default=Decimal("0.000"))


class PartialDeliveryCalculationResponse(BaseModel):
    """Schema representing backend formula calculation results for partial gold delivery."""
    order_id: int
    order_no: str
    total_ordered_quantity: Decimal
    delivered_so_far_quantity: Decimal
    dispatch_quantity: Decimal
    remaining_quantity_after_dispatch: Decimal
    proportional_amount_owed: Decimal
    is_valid: bool
    message: str | None = None
