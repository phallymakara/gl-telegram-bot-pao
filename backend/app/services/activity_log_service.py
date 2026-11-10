"""
Activity / Audit Logging Service.
Provides request-context actor extraction, safe audit persistence, and
paginated/filterable query helpers for the Super Admin Audit Logs console.
"""

from __future__ import annotations

from contextvars import ContextVar, Token
from datetime import datetime, time, timezone
import logging
from typing import Any

from fastapi import HTTPException, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.models.activity_log import ActivityLog
from app.models.user import User

logger = logging.getLogger(__name__)

_SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "new_password",
    "old_password",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "api_key",
    "bot_token",
    "telegram_bot_token",
    "jwt",
    "authorization",
}

DEFAULT_CATEGORIES = [
    "AUTH",
    "ORDERS",
    "STOCK",
    "PURCHASING",
    "DELIVERY",
    "FINANCE",
    "USERS",
    "SETTINGS",
    "MASTER_DATA",
]

_request_audit_context: ContextVar[dict[str, Any] | None] = ContextVar(
    "_request_audit_context",
    default=None,
)


def extract_client_ip(request: Request) -> str | None:
    """Extract originating client IP address respecting proxy headers."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()[:64]
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()[:64]
    if request.client and request.client.host:
        return str(request.client.host)[:64]
    return None


def set_request_audit_context(
    bearer_token: str | None,
    x_user_id: str | None,
    ip_address: str | None,
    user_agent: str | None,
    method: str | None = None,
    path: str | None = None,
) -> Token[dict[str, Any] | None]:
    """Attach per-request actor metadata to ContextVar for automatic service attribution."""
    return _request_audit_context.set(
        {
            "bearer_token": bearer_token,
            "x_user_id": x_user_id,
            "ip_address": ip_address[:64] if ip_address else None,
            "user_agent": user_agent[:255] if user_agent else None,
            "method": method,
            "path": path,
        }
    )


def reset_request_audit_context(token: Token[dict[str, Any] | None]) -> None:
    """Restore previous request ContextVar state cleanly."""
    _request_audit_context.reset(token)


def get_request_audit_context() -> dict[str, Any]:
    """Return active request audit metadata or an empty mapping outside HTTP context."""
    return _request_audit_context.get() or {}


def is_super_admin_user(user: User | None) -> bool:
    """Return True if the resolved User holds Super Admin privileges."""
    if not user or not user.is_active:
        return False
    role_norm = (user.role or "").strip().upper().replace(" ", "_")
    name_norm = (user.name or "").strip().lower()
    username_norm = (user.username or "").strip().lower()
    return (
        role_norm == "SUPER_ADMIN"
        or name_norm == "super admin"
        or username_norm in {"superadmin", "super_admin"}
    )


def _lookup_user_by_token(db: Session, token: str | None) -> User | None:
    """Decode Bearer JWT and look up matching User record without raising."""
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    user = db.query(User).filter(User.username == str(sub)).first()
    if user is None and str(sub).isdigit():
        user = db.query(User).filter(User.id == int(sub)).first()
    return user


def _lookup_user_by_x_user_id(db: Session, x_user_id: str | None) -> User | None:
    """Look up User from dashboard X-User-Id header when valid integer."""
    if not x_user_id:
        return None
    cleaned = str(x_user_id).strip()
    if not cleaned.isdigit():
        return None
    return db.query(User).filter(User.id == int(cleaned)).first()


def resolve_actor(
    db: Session,
    explicit_user: User | None = None,
    prefer_header: bool = True,
) -> dict[str, Any]:
    """
    Resolve actor identity + client metadata from explicit user, Bearer JWT, or X-User-Id.

    In dashboard switcher mode, `prefer_header=True` lets the UI's active selected user
    take attribution if `X-User-Id` is sent alongside a stale token, while authorization
    checks (`require_super_admin_actor`) validate Bearer JWT first when present.
    """
    ctx = get_request_audit_context()
    user = explicit_user

    if user is None:
        if prefer_header and ctx.get("x_user_id"):
            user = _lookup_user_by_x_user_id(db, ctx.get("x_user_id"))
        if user is None and ctx.get("bearer_token"):
            user = _lookup_user_by_token(db, ctx.get("bearer_token"))
        if user is None and ctx.get("x_user_id"):
            user = _lookup_user_by_x_user_id(db, ctx.get("x_user_id"))

    return {
        "user": user,
        "user_id": user.id if user else None,
        "username": user.username if user else None,
        "actor_name": user.name if user else None,
        "actor_role": user.role if user else None,
        "ip_address": ctx.get("ip_address"),
        "user_agent": ctx.get("user_agent"),
    }


def require_super_admin_actor(db: Session, request: Request | None = None) -> User:
    """
    Verify the caller holds Super Admin identity for accessing audit log endpoints.
    Uses Bearer JWT first if supplied, otherwise active dashboard `X-User-Id` header.
    """
    bearer_token: str | None = None
    x_user_id: str | None = None

    if request is not None:
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            bearer_token = auth_header[7:].strip()
        x_user_id = request.headers.get("x-user-id")
    else:
        ctx = get_request_audit_context()
        bearer_token = ctx.get("bearer_token")
        x_user_id = ctx.get("x_user_id")

    user = _lookup_user_by_token(db, bearer_token)
    if user is None and not bearer_token:
        user = _lookup_user_by_x_user_id(db, x_user_id)

    if not is_super_admin_user(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access is required to view system activity logs.",
        )
    assert user is not None
    return user


def _sanitize_details(value: Any) -> Any:
    """Recursively redact sensitive keys and coerce non-JSON primitives safely."""
    if isinstance(value, dict):
        sanitized: dict[str, Any] = {}
        for k, v in value.items():
            key_str = str(k)
            if key_str.lower() in _SENSITIVE_KEYS:
                sanitized[key_str] = "[REDACTED]"
            else:
                sanitized[key_str] = _sanitize_details(v)
        return sanitized
    if isinstance(value, list):
        return [_sanitize_details(item) for item in value]
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def log_activity(
    db: Session,
    *,
    action: str,
    category: str,
    description: str,
    entity_type: str | None = None,
    entity_id: str | int | None = None,
    details: dict[str, Any] | None = None,
    status_value: str = "SUCCESS",
    user: User | None = None,
    username_override: str | None = None,
    actor_name_override: str | None = None,
    actor_role_override: str | None = None,
    commit: bool = True,
) -> ActivityLog | None:
    """
    Persist an immutable activity log row without allowing logging failures
    to crash an already completed business workflow.
    """
    try:
        actor = resolve_actor(db, explicit_user=user)
        safe_details = _sanitize_details(details) if details is not None else None

        ctx = get_request_audit_context()
        if ctx.get("method") and ctx.get("path"):
            safe_details = dict(safe_details or {})
            safe_details.setdefault("http_method", ctx["method"])
            safe_details.setdefault("endpoint", ctx["path"])

        entry = ActivityLog(
            user_id=actor["user_id"],
            username=username_override or actor["username"] or "system",
            actor_name=actor_name_override or actor["actor_name"] or "System",
            actor_role=actor_role_override or actor["actor_role"] or "SYSTEM",
            action=action.strip().upper()[:100],
            category=category.strip().upper()[:50],
            entity_type=entity_type[:80] if entity_type else None,
            entity_id=str(entity_id)[:100] if entity_id is not None else None,
            description=description,
            details=safe_details,
            ip_address=actor["ip_address"],
            user_agent=actor["user_agent"],
            status=status_value.strip().upper()[:20],
        )
        db.add(entry)
        if commit:
            db.commit()
            db.refresh(entry)
        else:
            db.flush()
        return entry
    except Exception as exc:
        logger.warning("Failed to persist activity log action=%s: %s", action, exc)
        if commit:
            try:
                db.rollback()
            except Exception:
                pass
        return None


def _parse_date_boundary(raw_date: str, end_of_day: bool = False) -> datetime | None:
    """Parse YYYY-MM-DD or ISO date string into timezone-aware UTC datetime."""
    cleaned = (raw_date or "").strip()
    if not cleaned:
        return None
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        return None

    if len(cleaned) <= 10:
        boundary_time = time.max if end_of_day else time.min
        parsed = datetime.combine(parsed.date(), boundary_time)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def query_activity_logs(
    db: Session,
    *,
    search: str = "",
    category: str = "",
    action: str = "",
    status_filter: str = "",
    user_id: int | None = None,
    date_from: str = "",
    date_to: str = "",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ActivityLog], int]:
    """Return filtered, newest-first activity logs along with total matching count."""
    q = db.query(ActivityLog)

    if category:
        q = q.filter(ActivityLog.category == category.strip().upper())
    if action:
        q = q.filter(ActivityLog.action == action.strip().upper())
    if status_filter:
        q = q.filter(ActivityLog.status == status_filter.strip().upper())
    if user_id is not None:
        q = q.filter(ActivityLog.user_id == user_id)

    start_dt = _parse_date_boundary(date_from, end_of_day=False)
    if start_dt is not None:
        q = q.filter(ActivityLog.created_at >= start_dt)

    end_dt = _parse_date_boundary(date_to, end_of_day=True)
    if end_dt is not None:
        q = q.filter(ActivityLog.created_at <= end_dt)

    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                ActivityLog.username.ilike(term),
                ActivityLog.actor_name.ilike(term),
                ActivityLog.action.ilike(term),
                ActivityLog.category.ilike(term),
                ActivityLog.entity_type.ilike(term),
                ActivityLog.entity_id.ilike(term),
                ActivityLog.description.ilike(term),
                ActivityLog.ip_address.ilike(term),
            )
        )

    total = q.count()
    clamped_limit = max(1, min(limit, 200))
    clamped_offset = max(0, offset)
    rows = (
        q.order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())
        .offset(clamped_offset)
        .limit(clamped_limit)
        .all()
    )
    return rows, total


def get_activity_log_stats(db: Session) -> dict[str, Any]:
    """Compute KPI metrics and filter options for the Super Admin Audit Logs view."""
    now_utc = datetime.now(timezone.utc)
    today_start = datetime.combine(now_utc.date(), time.min, tzinfo=timezone.utc)

    total_logs = db.query(func.count(ActivityLog.id)).scalar() or 0
    today_logs = (
        db.query(func.count(ActivityLog.id))
        .filter(ActivityLog.created_at >= today_start)
        .scalar()
        or 0
    )
    auth_events_today = (
        db.query(func.count(ActivityLog.id))
        .filter(
            ActivityLog.created_at >= today_start,
            ActivityLog.category == "AUTH",
        )
        .scalar()
        or 0
    )
    sell_order_events = (
        db.query(func.count(ActivityLog.id))
        .filter(ActivityLog.category == "ORDERS")
        .scalar()
        or 0
    )
    stock_adjustments = (
        db.query(func.count(ActivityLog.id))
        .filter(ActivityLog.category == "STOCK")
        .scalar()
        or 0
    )
    failed_events = (
        db.query(func.count(ActivityLog.id))
        .filter(ActivityLog.status == "FAILED")
        .scalar()
        or 0
    )

    db_categories = {
        row[0]
        for row in db.query(ActivityLog.category).distinct().all()
        if row[0]
    }
    categories = sorted(set(DEFAULT_CATEGORIES) | db_categories)

    db_actions = sorted(
        row[0]
        for row in db.query(ActivityLog.action).distinct().all()
        if row[0]
    )

    return {
        "total_logs": total_logs,
        "today_logs": today_logs,
        "auth_events_today": auth_events_today,
        "sell_order_events": sell_order_events,
        "stock_adjustments": stock_adjustments,
        "failed_events": failed_events,
        "categories": categories,
        "actions": db_actions,
    }

