from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_gold: float
    total_orders: int
    sold_today: int
    buy_today: int
    total_buy_kg: float
    total_sell_kg: float
    physical_stock: float = 100.0
    incoming_po: float = 5.0
    remaining_incoming: float = 0.0
    gold_in_overseas: float = 25.0
    gold_in_local_platform: float = 30.0
    gold_in_local_physical: float = 20.5
    gold_in_local: float = 50.5
    gold_in_total: float = 75.5
    gold_out_overseas: float = 0.0
    gold_out_platform: float = 18.2
    gold_out_physical: float = 20.5
    gold_out_total: float = 38.7
    reserved: float = 40.0
    reserved_stock: float = 40.0
    reserved_incoming: float = 0.0
    available: float = 60.0
    open_orders: int = 12


class RevenuePoint(BaseModel):
    day: str
    buy: float
    sell: float


class DailyGoldFlow(BaseModel):
    po_overseas: float = 0.0
    po_local: float = 0.0
    po_local_platform: float = 0.0
    po_local_physical: float = 0.0
    total: float = 0.0


class DailyGoldOut(BaseModel):
    overseas: float = 0.0
    platform: float = 0.0
    physical: float = 0.0
    total: float = 0.0


class DailyOrderDetail(BaseModel):
    id: int
    order_no: str
    transaction_type: str
    quantity: float
    channel: str | None = None
    customer_name: str | None = None
    status: str
    slot_date_str: str | None = None
    created_at: str
    # "ORDER" = customer BUY/SELL order; "PO" = supplier purchase order (LOCAL/OVERSEA/BUYBACK).
    # Lets the frontend tell the two apart since they now share this one detail feed.
    source: str = "ORDER"


class DailyBreakdownRow(BaseModel):
    date: str
    gold_in: DailyGoldFlow
    gold_out: DailyGoldOut
    balance: float = 0.0
    transaction_count: int = 0
    orders: list[DailyOrderDetail] = []


class DailyBreakdownResponse(BaseModel):
    year: int
    month: int
    days: list[DailyBreakdownRow] = []


class StockMatrixCell(BaseModel):
    value: float | None = None
    order_id: int | None = None
    order_no: str | None = None


class StockMatrixColumn(BaseModel):
    id: str
    brand: str
    date_label: str
    target_date: str | None = None
    header_color: str
    text_color: str = "text-slate-900"
    import_stock: float
    trade_in: float = 0.0
    physical_sale: float = 0.0
    bot_sale: float = 0.0
    available_stock: float
    total_deductions: float
    deductions: list[float] = []
    trade_in_cell: StockMatrixCell | None = None
    physical_sale_cell: StockMatrixCell | None = None
    bot_sale_cell: StockMatrixCell | None = None


class StockMatrixLeftTotal(BaseModel):
    label: str
    value: float
    category: str = "cream"


class StockMatrixData(BaseModel):
    columns: list[StockMatrixColumn]
    deduction_rows: list[list[float | None]]
    deduction_cells: list[list[StockMatrixCell]] = []
    left_totals: list[StockMatrixLeftTotal]
    summary_deductions: list[float]


class StockMatrixDeductionCreate(BaseModel):
    brand: str
    date: str
    quantity: float
    channel: str | None = None
    transaction_type: str | None = "SELL"
    customer_name: str | None = "Manual Matrix Entry"


class StockMatrixDeductionUpdate(BaseModel):
    quantity: float


class StockMatrixImportUpdate(BaseModel):
    brand: str
    date: str
    quantity: float


class StockMatrixColumnCreate(BaseModel):
    brand: str
    date: str
    header_color: str | None = None
    after_id: str | None = None


class StockMatrixColumnUpdate(BaseModel):
    brand: str | None = None
    date: str | None = None


class SoldTrendPoint(BaseModel):
    date: str
    date_label: str
    swiss: float = 0.0
    db: float = 0.0
    sv: float = 0.0


class SoldTrendResponse(BaseModel):
    start_date: str
    end_date: str
    range_type: str
    points: list[SoldTrendPoint] = []

