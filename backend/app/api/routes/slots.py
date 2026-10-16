"""
Slot Tables & Slot Rows Management API routes.
Provides endpoints for managing trading slot tables (SELL / BUY tables) and date-based premium rows.
"""

from datetime import date as date_type
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_db
from app.api.schemas import SlotRowCreate, SlotRowResponse, SlotTableCreate, SlotTableResponse
from app.models.alert import Alert
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.models.purchase_order import PurchaseOrder, StockReturn
from app.models.slot_row import SlotRow
from app.models.slot_table import SlotTable
from app.services.slot_service import compute_vault_stock_sync, get_incoming_up_to_date_sync, rollover_past_slots_sync
from app.utils.helpers import get_cambodia_now

router = APIRouter()


def _raise_if_slot_referenced(db: Session, row_id: int) -> None:
    """Helper safety check throwing HTTP 409 if active orders reference a slot row."""
    refs = db.query(Order.id).filter(Order.slot_id == row_id).count()
    if refs:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete: {refs} order(s) reference this slot.",
        )


@router.get("/", response_model=list[SlotTableResponse])
def list_tables(db: Session = Depends(get_db)):
    """
    Retrieve all slot tables with eager-loaded slot rows, ordered by display order.
    Automatically rolls over past slot rows forward to current and upcoming dates.
    """
    rollover_past_slots_sync(db)
    tables = db.query(SlotTable).options(joinedload(SlotTable.rows)).order_by(SlotTable.display_order).all()
    return tables


@router.post("/", response_model=SlotTableResponse, status_code=status.HTTP_201_CREATED)
def create_table(body: SlotTableCreate, db: Session = Depends(get_db)):
    """
    Create a new slot table (e.g. SELL Table, BUY Table).
    Calculates next display order position automatically.
    Always starts at 0kg stock, regardless of what the caller sends: a table is just a container
    and date/premium schedule, not a stock source. Physical stock only enters through tracked,
    audited paths (PO receipt, customer buyback, or a manual stock adjustment via PUT).
    """
    max_order = db.query(SlotTable.display_order).order_by(SlotTable.display_order.desc()).first()
    table = SlotTable(
        table_name=body.table_name,
        stock=Decimal(0),
        display_order=(max_order[0] + 1) if max_order else 0,
    )
    db.add(table)
    db.flush()

    # Pre-populate new table with existing active slot dates so row count matches other tables
    existing_dates = (
        db.query(SlotRow.slot_date)
        .distinct()
        .filter(SlotRow.slot_date >= get_cambodia_now().date())
        .order_by(SlotRow.slot_date)
        .all()
    )
    for ed in existing_dates:
        d_val = ed[0]
        db.add(SlotRow(
            slot_table_id=table.id,
            slot_date=d_val,
            premium=Decimal(300),
            qty=Decimal(10.0),
        ))

    db.commit()
    return db.query(SlotTable).options(joinedload(SlotTable.rows)).filter(SlotTable.id == table.id).first()


@router.put("/{table_id}", response_model=SlotTableResponse)
def update_table(table_id: int, body: SlotTableCreate, db: Session = Depends(get_db)):
    """
    Update a slot table's name and/or physical stock directly -- e.g. a large PO is released to the
    sellable vault in batches (500kg PO, first 100kg sent out for sale now, more later), so stock
    needs to stay freely editable rather than gated behind a formal per-PO receive flow. Still logs
    an InventoryTransaction whenever stock changes, so it stays traceable even though editing it is
    frictionless.

    Raising a SELL table's stock is validated against what's actually allocatable, though. Since
    table stock is now a live "remaining" number (orders deduct it immediately on reservation, not
    at collection), the check is against how much is still genuinely unallocated: vault + today's
    eligible incoming, minus what every SELL table currently holds. Both vault and incoming are
    already net of every open reservation by the time we read them here -- deduct_store_stock_sync
    mutates table.stock and incoming_kg directly and immediately, there's no deferred/virtual
    reservation layer left to subtract on top. Otherwise the STOCK box becomes a number that looks
    real but isn't backed by anything -- exactly the confusion this whole reservation system was
    built to eliminate.
    """
    table = db.query(SlotTable).options(joinedload(SlotTable.rows)).filter(SlotTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

    stock_before = table.stock
    delta = body.stock - stock_before

    if "SELL" in table.table_name.upper() and delta > 0:
        other_sell_stock = float(db.query(func.coalesce(func.sum(SlotTable.stock), 0)).filter(
            SlotTable.table_name.ilike("%SELL%"),
            SlotTable.id != table_id,
            SlotTable.is_active == True,
        ).scalar() or 0)
        current_total_stock = other_sell_stock + float(stock_before)

        vault = compute_vault_stock_sync()
        today_str = get_cambodia_now().date().isoformat()
        incoming_today = get_incoming_up_to_date_sync("SELL", today_str)

        headroom = vault + incoming_today - current_total_stock

        if float(delta) > headroom:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot raise this table's stock by {delta}kg (from {stock_before}kg to {body.stock}kg): "
                    f"only {headroom:.3f}kg is genuinely unallocated right now "
                    f"({vault:.3f}kg vault + {incoming_today:.3f}kg incoming "
                    f"dated on/before {today_str}, minus {current_total_stock:.3f}kg already held across "
                    f"every SELL table)."
                ),
            )

    table.table_name = body.table_name
    table.stock = body.stock

    if body.stock != stock_before:
        db.add(InventoryTransaction(
            slot_table_id=table.id,
            transaction_type="TABLE_STOCK_MANUAL_EDIT",
            quantity=abs(body.stock - stock_before),
            stock_before=stock_before,
            stock_after=body.stock,
            remark=f"Manual stock edit on table '{table.table_name}'",
        ))

    db.commit()
    return db.query(SlotTable).options(joinedload(SlotTable.rows)).filter(SlotTable.id == table_id).first()


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_table(table_id: int, db: Session = Depends(get_db)):
    """
    Delete a slot table and clean up foreign key references across transactions, POs, alerts, and orders.
    Validates that no row in the table contains unfinished orders or incoming stock.
    """
    table = db.query(SlotTable).options(joinedload(SlotTable.rows)).filter(SlotTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

    # Clean up dependent transactions and disassociate foreign keys before deleting table
    db.query(InventoryTransaction).filter(InventoryTransaction.slot_table_id == table_id).delete(synchronize_session=False)
    db.query(StockReturn).filter(StockReturn.slot_table_id == table_id).delete(synchronize_session=False)
    db.query(PurchaseOrder).filter(PurchaseOrder.slot_table_id == table_id).update({"slot_table_id": None}, synchronize_session=False)
    db.query(Alert).filter(Alert.slot_table_id == table_id).update({"slot_table_id": None}, synchronize_session=False)

    for row in table.rows:
        db.query(Order).filter(Order.slot_id == row.id).update({"slot_id": None}, synchronize_session=False)

    db.delete(table)
    db.commit()


@router.post("/{table_id}/rows", response_model=SlotRowResponse, status_code=status.HTTP_201_CREATED)
def add_row(table_id: int, body: SlotRowCreate, db: Session = Depends(get_db)):
    """
    Add a new date-based premium row to a slot table.
    Validates that slot date is today or an upcoming date, and prevents duplicates.
    Synchronizes date row across all active slot tables (Buy and Sell).
    """
    if body.slot_date < get_cambodia_now().date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slot date cannot be in the past. Must be today or an upcoming date."
        )

    table = db.query(SlotTable).filter(SlotTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

    existing = db.query(SlotRow).filter(
        SlotRow.slot_table_id == table_id,
        SlotRow.slot_date == body.slot_date,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A slot for {body.slot_date} already exists in this table."
        )

    row = SlotRow(slot_table_id=table_id, slot_date=body.slot_date, premium=body.premium, qty=body.qty)
    db.add(row)

    # Automatically synchronize all other active slot tables (Buy and Sell) to have the same row date
    other_tables = db.query(SlotTable).filter(SlotTable.id != table_id, SlotTable.is_active == True).all()
    for other_t in other_tables:
        has_date = db.query(SlotRow).filter(
            SlotRow.slot_table_id == other_t.id,
            SlotRow.slot_date == body.slot_date,
        ).first()
        if not has_date:
            db.add(SlotRow(
                slot_table_id=other_t.id,
                slot_date=body.slot_date,
                premium=body.premium,
                qty=body.qty or Decimal(10.0),
            ))

    db.commit()
    db.refresh(row)
    return row


@router.put("/{table_id}/rows/{row_id}", response_model=SlotRowResponse)
def update_row(table_id: int, row_id: int, body: SlotRowCreate, db: Session = Depends(get_db)):
    """
    Update slot date, premium value, or available quantity for a slot row.
    Validates that slot date is today or an upcoming date, and prevents duplicates.
    Synchronizes date changes across all active slot tables.
    """
    if body.slot_date < get_cambodia_now().date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slot date cannot be in the past. Must be today or an upcoming date."
        )

    row = db.query(SlotRow).filter(SlotRow.id == row_id, SlotRow.slot_table_id == table_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Row not found")

    existing = db.query(SlotRow).filter(
        SlotRow.slot_table_id == table_id,
        SlotRow.slot_date == body.slot_date,
        SlotRow.id != row_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A slot for {body.slot_date} already exists in this table."
        )

    old_date = row.slot_date
    row.slot_date = body.slot_date
    row.premium = body.premium
    if body.qty is not None:
        row.qty = body.qty

    # If the date changed, synchronize the date across all other slot tables as well
    if old_date != body.slot_date:
        other_rows = db.query(SlotRow).filter(
            SlotRow.slot_table_id != table_id,
            SlotRow.slot_date == old_date,
        ).all()
        for other_r in other_rows:
            other_r.slot_date = body.slot_date

    db.commit()
    db.refresh(row)
    return row


@router.delete("/{table_id}/rows/{row_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_row(table_id: int, row_id: int, db: Session = Depends(get_db)):
    """
    Remove a slot row from a slot table and nullify references on existing completed orders.
    Synchronizes removal of this date row across all slot tables (Buy and Sell).
    Refuses to delete a row that still has unclaimed incoming_kg, active purchase orders,
    or active/uncompleted customer buy or sell orders.
    """
    row = db.query(SlotRow).filter(SlotRow.id == row_id, SlotRow.slot_table_id == table_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Row not found")

    target_date = row.slot_date
    date_str = target_date.strftime("%Y-%m-%d")

    # Find matching date rows across all slot tables
    all_matching_rows = db.query(SlotRow).filter(SlotRow.slot_date == target_date).all()
    matching_row_ids = [r.id for r in all_matching_rows]

    # 1. Validate: Unreceived incoming stock on any matching slot row
    for r in all_matching_rows:
        if r.incoming_kg and r.incoming_kg > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot delete date {target_date}: it still has {r.incoming_kg}kg of unreceived incoming stock. "
                    "Please finish receiving stock or cancel the related orders first."
                ),
            )

    # 2. Validate: Unfinished customer Buy or Sell orders on this date
    # Active/Unfinished orders are those not in COLLECTED, COMPLETED, or CANCELLED
    FINISHED_ORDER_STATUSES = {"COLLECTED", "COMPLETED", "CANCELLED"}
    unfinished_orders = (
        db.query(Order)
        .filter(
            or_(
                Order.slot_id.in_(matching_row_ids),
                Order.slot_date_str == date_str,
            ),
            ~func.upper(Order.status).in_(FINISHED_ORDER_STATUSES),
        )
        .all()
    )
    if unfinished_orders:
        first_ord = unfinished_orders[0]
        txn_name = "Sell" if (first_ord.transaction_type or "").upper() == "SELL" else "Buy"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot delete date {target_date}: it contains {len(unfinished_orders)} active {txn_name} order(s) "
                f"(e.g., order {first_ord.order_no} with status '{first_ord.status}'). "
                "Please finish (collect) or cancel all orders for this date completely before deleting this slot date."
            ),
        )

    # 3. Validate: Unfinished supplier purchase orders on this date
    # Active/Unfinished POs are those not in RECEIVED, COMPLETED, or CANCELLED
    FINISHED_PO_STATUSES = {"RECEIVED", "COMPLETED", "CANCELLED"}
    unfinished_pos = (
        db.query(PurchaseOrder)
        .filter(
            or_(
                PurchaseOrder.expected_date == target_date,
                PurchaseOrder.order_date == target_date,
                PurchaseOrder.received_date == target_date,
            ),
            ~func.upper(PurchaseOrder.status).in_(FINISHED_PO_STATUSES),
        )
        .all()
    )
    if unfinished_pos:
        first_po = unfinished_pos[0]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot delete date {target_date}: it contains {len(unfinished_pos)} active Purchase Order(s) "
                f"(e.g., PO {first_po.po_no} with status '{first_po.status}'). "
                "Please finish receiving or cancel all purchase orders for this date completely before deleting this slot date."
            ),
        )

    # Unlink completed orders and delete rows for this date across all tables to keep Buy & Sell slots in sync
    for r in all_matching_rows:
        db.query(Order).filter(Order.slot_id == r.id).update({"slot_id": None}, synchronize_session=False)
        db.delete(r)

    db.commit()

