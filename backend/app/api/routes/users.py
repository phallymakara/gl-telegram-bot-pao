"""
User Management API routes.
Provides endpoints for managing administrative users, roles, and password security.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.services.activity_log_service import log_activity
from app.api.schemas import UserCreate, UserResponse, UserUpdate
from app.core.config import (
    DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_NAME,
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_ADMIN_USERNAME,
)
from app.core.security import hash_password
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """
    Retrieve all administrative platform users.
    Bootstraps the initial Super Admin account from environment variables only when configured.
    """
    users = db.query(User).order_by(User.id.asc()).all()
    if not users:
        if DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD:
            admin_user = User(
                name=DEFAULT_ADMIN_NAME,
                username=DEFAULT_ADMIN_USERNAME,
                email=DEFAULT_ADMIN_EMAIL,
                password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
                role="Super Admin",
                is_active=True,
                allowed_modules=["*"],
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            users = [admin_user]
        else:
            logger.warning(
                "No users found and DEFAULT_ADMIN_* environment variables are incomplete; skipping auto-bootstrap"
            )
    return users


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new administrative platform user.
    Hashes raw password securely using bcrypt prior to database storage.
    Raises HTTP 409 Conflict if username or email already exists.
    """
    existing = db.query(User).filter(
        (User.username == body.username) | (User.email == body.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists",
        )
    user = User(
        name=body.name,
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        is_active=body.is_active,
        allowed_modules=body.allowed_modules or [],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_activity(
        db,
        action="USER_CREATED",
        category="USERS",
        description=f"Created user account {user.name} (@{user.username}) with role {user.role}",
        entity_type="User",
        entity_id=user.id,
        details={"username": user.username, "role": user.role, "is_active": user.is_active},
    )
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db)):
    """
    Update administrative user fields (name, email, role, password, allowed_modules, or active status) by ID.
    Raises HTTP 404 if the user does not exist.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        dup = db.query(User).filter(User.email == body.email, User.id != user_id).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        user.email = body.email
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.allowed_modules is not None:
        user.allowed_modules = body.allowed_modules
    if body.password is not None and body.password.strip():
        user.password_hash = hash_password(body.password.strip())
    db.commit()
    db.refresh(user)
    log_activity(
        db,
        action="USER_UPDATED",
        category="USERS",
        description=f"Updated user account {user.name} (@{user.username}) — Role: {user.role}, Active: {user.is_active}",
        entity_type="User",
        entity_id=user.id,
        details={"username": user.username, "role": user.role, "is_active": user.is_active, "allowed_modules": user.allowed_modules},
    )
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete an administrative user by ID.
    Returns HTTP 204 No Content upon deletion.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    target_username = user.username
    target_name = user.name
    db.delete(user)
    db.commit()
    log_activity(
        db,
        action="USER_DELETED",
        category="USERS",
        description=f"Deleted user account {target_name} (@{target_username})",
        entity_type="User",
        entity_id=user_id,
    )

