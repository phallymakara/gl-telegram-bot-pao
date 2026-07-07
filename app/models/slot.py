from dataclasses import dataclass


@dataclass
class Slot:
    slot_date: str
    premium: float
    stock_kg: float
    min_order: float
    active: str