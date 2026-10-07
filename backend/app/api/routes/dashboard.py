"""
Dashboard & Analytics API routes.
Provides endpoints for retrieving high-level gold trading statistics and revenue chart trend metrics.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.dashboard import (
    DashboardStats,
    RevenuePoint,
    DailyBreakdownResponse,
    StockMatrixData,
    StockMatrixDeductionCreate,
    StockMatrixDeductionUpdate,
    StockMatrixImportUpdate,
    StockMatrixColumnCreate,
    StockMatrixColumnUpdate,
    SoldTrendResponse,
)
from app.services.dashboard_service import (
    calculate_dashboard_stats,
    calculate_revenue_points,
    calculate_daily_breakdown,
    calculate_stock_matrix,
    calculate_brand_sold_trend,
    create_stock_matrix_deduction,
    update_stock_matrix_deduction,
    delete_stock_matrix_deduction,
    update_stock_matrix_import,
    add_matrix_column,
    delete_matrix_column,
    update_matrix_column,
)

router = APIRouter()



@router.get("/stats", response_model=DashboardStats)
def get_stats(target_date: str = "", db: Session = Depends(get_db)):
    """
    Retrieve comprehensive gold inventory, buy/sell volumes, PO metrics, and status breakdowns.
    Delegates calculation logic to dashboard_service.
    """
    return calculate_dashboard_stats(db, target_date)


@router.get("/revenue", response_model=list[RevenuePoint])
def get_revenue(range: str = "week", db: Session = Depends(get_db)):
    """
    Retrieve aggregated buy and sell volume data points for analytics charts.
    Supported ranges: 'week', 'month', 'year'.
    """
    return calculate_revenue_points(db, range)


@router.get("/daily-breakdown", response_model=DailyBreakdownResponse)
def get_daily_breakdown(target_date: str = "", db: Session = Depends(get_db)):
    """
    Retrieve per-day gold in/out breakdown for a 7-day window around the target date (default: today).
    Each day includes inflow by source, outflow by channel, balance, and order details.
    """
    return calculate_daily_breakdown(db, target_date)


@router.get("/stock-matrix", response_model=StockMatrixData)
def get_stock_matrix(target_date: str = "", db: Session = Depends(get_db)):
    """
    Retrieve the operational brand and settlement date inventory spreadsheet matrix.
    Defaults to today and forward dates. Past dates are strictly excluded.
    """
    return calculate_stock_matrix(db, target_date)


@router.get("/sold-trend", response_model=SoldTrendResponse)
def get_sold_trend(
    range_type: str = "7d",
    start_date: str = "",
    end_date: str = "",
    db: Session = Depends(get_db),
):
    """
    Retrieve gold sold volume trend metrics grouped by brand (Swiss, DB, SV) over a date range.
    Supports preset ranges ('7d', '14d', '30d', 'month') and custom start_date/end_date filters.
    """
    return calculate_brand_sold_trend(
        db,
        range_type=range_type,
        start_date=start_date,
        end_date=end_date,
    )


@router.post("/stock-matrix/deduction", status_code=status.HTTP_201_CREATED)
def add_matrix_deduction(body: StockMatrixDeductionCreate, db: Session = Depends(get_db)):
    """
    Persist a new deduction SELL order in the real database from the Stock Matrix.
    """
    try:
        order = create_stock_matrix_deduction(db, body)
        return {"success": True, "order_id": order.id, "order_no": order.order_no}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/stock-matrix/deduction/{order_id}")
def edit_matrix_deduction(order_id: int, body: StockMatrixDeductionUpdate, db: Session = Depends(get_db)):
    """
    Update an existing deduction SELL order's quantity in the real database.
    """
    try:
        order = update_stock_matrix_deduction(db, order_id, body.quantity)
        return {"success": True, "order_id": order.id, "order_no": order.order_no}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/stock-matrix/deduction/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_matrix_deduction(order_id: int, db: Session = Depends(get_db)):
    """
    Delete a deduction SELL order from the real database.
    """
    try:
        delete_stock_matrix_deduction(db, order_id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/stock-matrix/import-stock")
def edit_matrix_import(body: StockMatrixImportUpdate, db: Session = Depends(get_db)):
    """
    Update or create a PurchaseOrder import stock for a brand & date in the real database.
    """
    try:
        po = update_stock_matrix_import(db, body.brand, body.date, body.quantity)
        return {"success": True, "po_id": po.id, "po_no": po.po_no}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/stock-matrix/column", response_model=StockMatrixData, status_code=status.HTTP_201_CREATED)
def create_matrix_column(body: StockMatrixColumnCreate, db: Session = Depends(get_db)):
    """
    Persistently add a new column to the stock matrix in the database.
    """
    try:
        return add_matrix_column(
            db=db,
            brand=body.brand,
            date_str=body.date,
            header_color=body.header_color,
            after_id=body.after_id,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/stock-matrix/column/{col_id}", response_model=StockMatrixData)
def remove_matrix_column(col_id: str, db: Session = Depends(get_db)):
    """
    Persistently delete a column from the stock matrix in the database.
    """
    try:
        return delete_matrix_column(db=db, col_id=col_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/stock-matrix/column/{col_id}", response_model=StockMatrixData)
def edit_matrix_column(col_id: str, body: StockMatrixColumnUpdate, db: Session = Depends(get_db)):
    """
    Persistently update brand or date for a column in the stock matrix.
    """
    try:
        return update_matrix_column(
            db=db,
            col_id=col_id,
            brand=body.brand,
            date_str=body.date,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))




