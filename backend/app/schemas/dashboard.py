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
    gold_in_local: float = 35.0
    gold_in_customer: float = 15.5
    gold_in_total: float = 75.5
    gold_out_telegram: float = 18.2
    gold_out_phone: float = 12.0
    gold_out_walkin: float = 8.5
    gold_out_total: float = 38.7
    reserved: float = 40.0
    available: float = 60.0
    open_orders: int = 12


class RevenuePoint(BaseModel):
    day: str
    buy: float
    sell: float
