"""
Super Admin Activity & Audit Logs API Routes.
Provides filtered/paginated audit log querying, summary stats, and auth/session event logging.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.user import User
from app.schemas.activity_log import (
    ActivityLogListResponse,
    ActivityLogResponse,
    ActivityLogStatsResponse,
    AuthActivityEventRequest,
)
from app.services.activity_log_service import (
    get_activity_log_stats,
    log_activity,
    query_activity_logs,
    require_super_admin_actor,
    resolve_actor,
)

router = APIRouter()


@router.get("/", response_model=ActivityLogListResponse)
def list_activity_logs(
    request: Request,
    search: str = "",
    category: str = "",
    action: str = "",
    status_filter: str = Query(default="", alias="status"),
    user_id: int | None = None,
    date_from: str = "",
    date_to: str = "",
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """
    List system activity logs with search, category, action, status, user, and date filtering.
    Restricted to Super Admin actors.
    """
    require_super_admin_actor(db, request)
    rows, total = query_activity_logs(
        db,
        search=search,
        category=category,
        action=action,
        status_filter=status_filter,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return ActivityLogListResponse(
        items=[ActivityLogResponse.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/stats", response_model=ActivityLogStatsResponse)
def get_audit_log_stats(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Return aggregated audit log counts and available filter categories/actions.
    Restricted to Super Admin actors.
    """
    require_super_admin_actor(db, request)
    return ActivityLogStatsResponse(**get_activity_log_stats(db))


@router.post("/auth-event", response_model=ActivityLogResponse, status_code=status.HTTP_201_CREATED)
def record_auth_event(
    payload: AuthActivityEventRequest,
    db: Session = Depends(get_db),
):
    """
    Record authentication/session lifecycle events triggered from the dashboard UI
    (account switch, logout, Super Admin unlock/lock).
    """
    actor_info = resolve_actor(db)
    target_user: User | None = (
        db.query(User).filter(User.id == payload.target_user_id).first()
        if payload.target_user_id is not None
        else actor_info["user"]
    )
    previous_user: User | None = (
        db.query(User).filter(User.id == payload.previous_user_id).first()
        if payload.previous_user_id is not None
        else None
    )

    if payload.event_type in {"USER_LOGIN", "SUPER_ADMIN_UNLOCK"} and target_user is not None:
        target_user.last_login = datetime.now(timezone.utc)
        db.commit()

    description = payload.description
    if not description:
        target_label = (
            f"{target_user.name} (@{target_user.username})"
            if target_user
            else "Unknown user"
        )
        prev_label = (
            f"{previous_user.name} (@{previous_user.username})"
            if previous_user
            else None
        )
        if payload.event_type == "USER_SWITCH" and prev_label:
            description = f"Switched active dashboard session from {prev_label} to {target_label}"
        elif payload.event_type == "USER_LOGOUT":
            description = f"User {target_label} logged out of dashboard session"
        elif payload.event_type == "SUPER_ADMIN_UNLOCK":
            description = f"Unlocked Super Admin privileges for {target_label}"
        elif payload.event_type == "SUPER_ADMIN_LOCK":
            description = f"Locked Super Admin privileges for {target_label}"
        else:
            description = f"User {target_label} signed in to dashboard session"

    details: dict[str, object] = {}
    if previous_user:
        details["previous_user_id"] = previous_user.id
        details["previous_username"] = previous_user.username
        details["previous_name"] = previous_user.name
    if target_user:
        details["target_user_id"] = target_user.id
        details["target_username"] = target_user.username
        details["target_role"] = target_user.role

    # Attribute USER_LOGOUT to the logging-out user; switches to target user
    log_user = target_user or previous_user or actor_info["user"]
    entry = log_activity(
        db,
        action=payload.event_type,
        category="AUTH",
        description=description,
        entity_type="User",
        entity_id=log_user.id if log_user else None,
        details=details or None,
        user=log_user,
    )
    assert entry is not None
    return ActivityLogResponse.model_validate(entry)

