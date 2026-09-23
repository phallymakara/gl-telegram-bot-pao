"""
User Management API routes.
Provides endpoints for managing administrative users, roles, and password security.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.api.schemas import UserCreate, UserResponse, UserUpdate
from app.core.security import hash_password
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """
    Retrieve all administrative platform users.
    Auto-seeds a default Super Admin account if the database contains no users.
    """
    users = db.query(User).order_by(User.id.asc()).all()
    if not users:
        admin_user = User(
            name="Super Admin",
            username="admin",
            email="admin@goldsystem.com",
            password_hash=hash_password("admin123"),
            role="Super Admin",
            is_active=True,
            allowed_modules=["*"],
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        users = [admin_user]
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
    db.delete(user)
    db.commit()

