"""
Inventory & Physical Stock Movement API routes.
Provides endpoints for retrieving unified stock ledger movements (POs, Customer Orders, and Vault Adjustments),
and creating/updating manual daily vault inventory audits.
"""

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.api.schemas import DailyInventoryCreate, DailyInventoryResponse
from app.models.daily_inventory import DailyInventory
from app.models.order import Order
from app.models.purchase_order import PurchaseOrder

router = APIRouter()

MAX_ROWS = 1000


@router.get("/", response_model=list[DailyInventoryResponse])
def list_inventory(
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
):
    """
    Retrieve unified stock movement ledger sorted by date descending.
    Aggregates gold inflows (Purchase Orders), outflows (Customer Sell Orders), and vault adjustments.
    Optional filters: year (YYYY) and month (1-12).
    """
    results: list[dict] = []

    # 1. Purchase Orders (Inflow / Incoming stock from suppliers)
    pos = db.query(PurchaseOrder).all()
    for po in pos:
        p_date = po.received_date or po.order_date or (po.created_at.date() if hasattr(po.created_at, "date") else None)
        if not p_date:
            continue
        if year is not None and p_date.year != year:
            continue
        if month is not None and p_date.month != month:
            continue

        party_name = po.supplier_name or "Supplier"
        type_label = f"{po.po_type.capitalize()} Purchase Order" if po.po_type else "Purchase Order"

        results.append({
            "id": 100000 + po.id,  # Unique ID namespace for PO entries
            "reference": po.po_no,
            "inventory_date": str(p_date),
            "party": party_name,
            "name": type_label,
            "stock_kg": Decimal(str(po.quantity)),
            "total_amount": po.total_cost,
            "notes": po.notes or f"Status: {po.status}",
            "created_at": po.created_at,
            "updated_at": po.updated_at,
        })

    # 2. Customer Orders (Outflow for store SELL / Inflow for store BUY)
    orders = db.query(Order).all()
    for o in orders:
        o_date = o.created_at.date() if hasattr(o.created_at, "date") else None
        if not o_date:
            continue
        if year is not None and o_date.year != year:
            continue
        if month is not None and o_date.month != month:
            continue

        party_name = o.customer_name or (f"@{o.username}" if o.username else "Customer")
        channel_name = o.channel or ("TELEGRAM" if o.telegram_user_id else "WALK_IN")
        name_label = f"Sell Order ({channel_name})"

        qty = Decimal(str(o.quantity))
        is_sell = (o.transaction_type or "SELL").upper() == "SELL"
        # Store perspective: SELL reduces physical gold (-qty), BUY increases stock (+qty)
        stock_movement = -qty if is_sell else qty

        results.append({
            "id": 200000 + o.id,  # Unique ID namespace for Customer Order entries
            "reference": o.order_no,
            "inventory_date": str(o_date),
            "party": party_name,
            "name": name_label,
            "stock_kg": stock_movement,
            "total_amount": o.total_amount or Decimal(0),
            "notes": f"Channel: {channel_name} | Status: {o.status}",
            "created_at": o.created_at,
            "updated_at": o.updated_at,
        })

    # 3. Manual Vault Stock Adjustments
    adjustments = db.query(DailyInventory).all()
    for adj in adjustments:
        adj_date = adj.inventory_date
        if year is not None and adj_date.year != year:
            continue
        if month is not None and adj_date.month != month:
            continue

        results.append({
            "id": adj.id,
            "reference": f"ADJ-2026-{adj.id:03d}",
            "inventory_date": str(adj.inventory_date),
            "party": "Internal Vault",
            "name": "Stock Adjustment",
            "stock_kg": Decimal(str(adj.stock_kg)),
            "total_amount": Decimal(0),
            "notes": "Vault audit adjustment",
            "created_at": adj.created_at,
            "updated_at": adj.updated_at,
        })

    # Sort unified results by inventory_date descending
    results.sort(key=lambda x: (x["inventory_date"], x["id"]), reverse=True)
    return results


@router.post("/", response_model=DailyInventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory(body: DailyInventoryCreate, db: Session = Depends(get_db)):
    """
    Record a manual daily vault stock audit entry.
    Enforces uniqueness per inventory date and bounds total rows to MAX_ROWS.
    """
    count = db.query(DailyInventory).count()
    if count >= MAX_ROWS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Maximum of {MAX_ROWS} inventory rows reached.",
        )
    existing = db.query(DailyInventory).filter(DailyInventory.inventory_date == body.inventory_date).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An inventory row already exists for this date.",
        )
    row = DailyInventory(inventory_date=body.inventory_date, stock_kg=body.stock_kg)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{row_id}", response_model=DailyInventoryResponse)
def update_inventory(row_id: int, body: DailyInventoryCreate, db: Session = Depends(get_db)):
    """
    Update an existing manual inventory audit row by ID.
    Ensures no duplicate entry is created for the target date.
    """
    row = db.query(DailyInventory).filter(DailyInventory.id == row_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory row not found")
    existing = (
        db.query(DailyInventory)
        .filter(
            DailyInventory.inventory_date == body.inventory_date,
            DailyInventory.id != row_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An inventory row already exists for this date.",
        )
    row.inventory_date = body.inventory_date
    row.stock_kg = body.stock_kg
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{row_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory(row_id: int, db: Session = Depends(get_db)):
    """
    Delete a manual inventory audit row by ID.
    Returns HTTP 204 No Content upon deletion.
    """
    row = db.query(DailyInventory).filter(DailyInventory.id == row_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory row not found")
    db.delete(row)
    db.commit()

