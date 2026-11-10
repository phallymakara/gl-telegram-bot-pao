from pydantic import BaseModel
from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class VerifySuperAdminRequest(BaseModel):
    password: str


class VerifySuperAdminResponse(BaseModel):
    verified: bool
    user_id: int
