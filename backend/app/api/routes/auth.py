"""
Authentication API routes.
Provides endpoints for user login, JWT token issuance, and current authenticated user profile retrieval.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.api.schemas import LoginRequest, TokenResponse, UserResponse
from app.core.security import create_access_token, verify_password
from app.models.user import User

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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Issue JWT token containing subject (user ID) and role claims
    token = create_access_token({"sub": str(user.id), "role": user.role})
    logger.info("Successful login for user_id=%s, role=%s", user.id, user.role)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """
    Retrieve user profile information for the currently authenticated bearer token session.
    Protected route requiring valid Bearer Authorization header.
    """
    logger.debug("Retrieved profile for user_id=%s", current_user.id)
    return current_user



