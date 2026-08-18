"""
Alert management API routes.
Provides endpoints for creating, retrieving, updating, and deleting promotional/system alert configurations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.api.schemas import AlertCreate, AlertResponse
from app.models.alert import Alert

router = APIRouter()


@router.get("/", response_model=list[AlertResponse])
def list_alerts(alert_type: str = "", db: Session = Depends(get_db)):
    """
    Retrieve all configured system alerts, ordered by creation date descending.
    Optionally filter by alert_type (e.g., PROMOTION, SYSTEM, INVENTORY).
    """
    q = db.query(Alert).order_by(Alert.created_at.desc())
    if alert_type:
        # Standardize alert type casing for filtering
        q = q.filter(Alert.type == alert_type.upper())
    return q.all()


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(body: AlertCreate, db: Session = Depends(get_db)):
    """
    Create a new system or promotional alert configuration.
    Alert types determine broadcasting criteria during background promotion loops.
    """
    alert = Alert(
        type=body.type.upper(),
        title=body.title,
        message=body.message,
        premium=body.premium,
        discount=body.discount,
        discount_type=body.discount_type,
        trigger_stock=body.trigger_stock,
        start_at=body.start_at,
        end_at=body.end_at,
        slot_table_id=body.slot_table_id,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(alert_id: int, body: AlertCreate, db: Session = Depends(get_db)):
    """
    Update an existing alert configuration by ID.
    Raises HTTP 404 if the specified alert does not exist.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert.type = body.type.upper()
    alert.title = body.title
    alert.message = body.message
    alert.premium = body.premium
    alert.discount = body.discount
    alert.discount_type = body.discount_type
    alert.trigger_stock = body.trigger_stock
    alert.start_at = body.start_at
    alert.end_at = body.end_at
    alert.slot_table_id = body.slot_table_id
    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    """
    Delete an alert configuration by ID.
    Returns HTTP 204 No Content upon successful deletion.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    db.delete(alert)
    db.commit()

