from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class PurchaseOrderCreate(BaseModel):
    po_no: str | None = None
    po_type: str
    supplier_id: int | None = None
    supplier_name: str | None = None
    product_type: str | None = None
    unit_type: str | None = "Kg"
    slot_table_id: int | None = None
    quantity: Decimal
    spot_price: Decimal | None = None
    premium: Decimal | None = None
    unit_cost: Decimal | None = None
    currency: str = "USD"
    order_date: date | None = None
    expected_date: date | None = None
    received_date: date | None = None
    notes: str | None = None
    shipping_method: str | None = None
    tracking_no: str | None = None
    customs_fee: Decimal | None = None
    port_of_origin: str | None = None



class PurchaseOrderUpdate(BaseModel):
    po_type: str | None = None
    supplier_name: str | None = None
    product_type: str | None = None
    unit_type: str | None = None
    quantity: Decimal | None = None
    spot_price: Decimal | None = None
    premium: Decimal | None = None
    unit_cost: Decimal | None = None
    order_date: date | None = None
    expected_date: date | None = None
    received_date: date | None = None
    notes: str | None = None
    status: str | None = None


class PurchaseOrderResponse(BaseModel):
    id: int
    po_no: str
    po_type: str
    supplier_id: int | None = None
    supplier_name: str | None = None
    product_type: str | None = None
    unit_type: str | None = "Kg"
    slot_table_id: int | None = None
    slot_table_name: str | None = None
    quantity: Decimal
    spot_price: Decimal | None = None
    premium: Decimal | None = None
    unit_cost: Decimal
    total_cost: Decimal
    currency: str
    status: str
    order_date: date | None
    expected_date: date | None
    received_date: date | None
    notes: str | None
    shipping_method: str | None
    tracking_no: str | None
    customs_fee: Decimal | None
    port_of_origin: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class POReturnRequest(BaseModel):
    quantity: Decimal
    reason: str | None = None


class CalculatePricingRequest(BaseModel):
    product_type: str | None = None
    unit_type: str | None = None
    spot_price: Decimal | None = None
    premium: Decimal | None = None
    quantity: Decimal | None = None
    total_cost: Decimal | None = None
    last_edited_field: str | None = None


class CalculatePricingResponse(BaseModel):
    conversion_factor: Decimal
    unit_cost: Decimal
    spot_price: Decimal | None = None
    premium: Decimal | None = None
    quantity: Decimal | None = None
    total_cost: Decimal | None = None
    solved_field: str | None = None
