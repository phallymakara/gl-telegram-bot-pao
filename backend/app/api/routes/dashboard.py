from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.dashboard import DashboardStats, RevenuePoint
from app.services.dashboard_service import calculate_dashboard_stats, calculate_revenue_points

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_stats(target_date: str = "", db: Session = Depends(get_db)):
    return calculate_dashboard_stats(db, target_date)


@router.get("/revenue", response_model=list[RevenuePoint])
def get_revenue(range: str = "week", db: Session = Depends(get_db)):
    return calculate_revenue_points(db, range)
