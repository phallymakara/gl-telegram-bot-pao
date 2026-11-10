"""
Authentication API routes.
Provides endpoints for user login, JWT token issuance, and current authenticated user profile retrieval.
"""

from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.api.schemas import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    VerifySuperAdminRequest,
    VerifySuperAdminResponse,
)
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.services.activity_log_service import log_activity, resolve_actor

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user credentials (username and password) and issue a JWT access token.
    Raises HTTP 401 Unauthorized if username is not found or password verification fails.
    """
    logger.info("Authentication attempt for username=%s", body.username)

    # Locate active user record by username
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        logger.warning("Failed login attempt for username=%s", body.username)
        log_activity(
            db,
            action="USER_LOGIN_FAILED",
            category="AUTH",
            description=f"Failed login attempt for username '{body.username}'",
            entity_type="User",
            entity_id=user.id if user else body.username,
            details={"attempted_username": body.username, "reason": "invalid_credentials"},
            status_value="FAILED",
            user=user,
            username_override=body.username if not user else None,
            actor_name_override=body.username if not user else None,
            actor_role_override="UNKNOWN" if not user else None,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        log_activity(
            db,
            action="USER_LOGIN_FAILED",
            category="AUTH",
            description=f"Blocked login for inactive account '{user.username}'",
            entity_type="User",
            entity_id=user.id,
            details={"attempted_username": user.username, "reason": "account_inactive"},
            status_value="FAILED",
            user=user,
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    log_activity(
        db,
        action="USER_LOGIN",
        category="AUTH",
        description=f"User {user.name} (@{user.username}) logged in",
        entity_type="User",
        entity_id=user.id,
        details={"role": user.role},
        user=user,
    )

    # Issue JWT token containing subject (user ID) and role claims
    token = create_access_token({"sub": str(user.id), "role": user.role})
    logger.info("Successful login for user_id=%s, role=%s", user.id, user.role)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/logout")
def logout(db: Session = Depends(get_db)):
    """
    Record explicit user logout event for the active authenticated or switched session.
    """
    actor = resolve_actor(db)
    actor_user = actor["user"]
    label = f"{actor_user.name} (@{actor_user.username})" if actor_user else "Unknown user"
    log_activity(
        db,
        action="USER_LOGOUT",
        category="AUTH",
        description=f"User {label} logged out",
        entity_type="User",
        entity_id=actor_user.id if actor_user else None,
        user=actor_user,
    )
    return {"status": "ok"}


@router.post("/verify-super-admin", response_model=VerifySuperAdminResponse)
def verify_super_admin(body: VerifySuperAdminRequest, db: Session = Depends(get_db)):
    """
    Verify an entered password against active Super Admin accounts stored in the database.
    Replaces client-side hardcoded checks and records failed verification attempts.
    """
    if not body.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter the password",
        )

    super_admins = (
        db.query(User)
        .filter(
            User.is_active.is_(True),
            (User.role.in_(["Super Admin", "SUPER_ADMIN"]) | (User.name == "Super Admin")),
        )
        .all()
    )
    matched = next(
        (su for su in super_admins if su.password_hash and verify_password(body.password, su.password_hash)),
        None,
    )
    if not matched:
        actor = resolve_actor(db)
        actor_user = actor["user"]
        log_activity(
            db,
            action="SUPER_ADMIN_UNLOCK_FAILED",
            category="AUTH",
            description="Failed Super Admin verification attempt",
            entity_type="User",
            entity_id=actor_user.id if actor_user else None,
            details={"reason": "invalid_password"},
            status_value="FAILED",
            user=actor_user,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )

    return VerifySuperAdminResponse(verified=True, user_id=matched.id)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """
    Retrieve user profile information for the currently authenticated bearer token session.
    Protected route requiring valid Bearer Authorization header.
    """
    logger.debug("Retrieved profile for user_id=%s", current_user.id)
    return current_user



