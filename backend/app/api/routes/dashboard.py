"""
Dashboard & Analytics API routes.
Provides endpoints for retrieving high-level gold trading statistics and revenue chart trend metrics.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.dashboard import DashboardStats, RevenuePoint, DailyBreakdownResponse
from app.services.dashboard_service import calculate_dashboard_stats, calculate_revenue_points, calculate_daily_breakdown

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

