"""
Pydantic Request/Response Schemas for System Activity & Audit Logs.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ActivityLogResponse(BaseModel):
    """Serialized activity log record returned to Super Admin audit views."""

    id: int
    user_id: int | None = None
    username: str | None = None
    actor_name: str | None = None
    actor_role: str | None = None
    action: str
    category: str
    entity_type: str | None = None
    entity_id: str | None = None
    description: str
    details: dict[str, Any] | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityLogListResponse(BaseModel):
    """Paginated activity log listing response."""

    items: list[ActivityLogResponse]
    total: int
    limit: int
    offset: int


class ActivityLogStatsResponse(BaseModel):
    """Aggregated summary metrics for the Super Admin Audit Logs dashboard."""

    total_logs: int
    today_logs: int
    auth_events_today: int
    sell_order_events: int
    stock_adjustments: int
    failed_events: int
    categories: list[str]
    actions: list[str]


class AuthActivityEventRequest(BaseModel):
    """
    Frontend-initiated authentication/session event payload
    (e.g., user switch, explicit logout, or Super Admin unlock/lock).
    """

    event_type: Literal[
        "USER_LOGIN",
        "USER_LOGOUT",
        "USER_SWITCH",
        "SUPER_ADMIN_UNLOCK",
        "SUPER_ADMIN_LOCK",
    ]
    target_user_id: int | None = Field(default=None, ge=1)
    previous_user_id: int | None = Field(default=None, ge=1)
    description: str | None = Field(default=None, max_length=500)

