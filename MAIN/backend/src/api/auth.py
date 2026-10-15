"""Authentication dependency using Supabase JWT validation.

The backend does NOT trust the frontend for user identification.
The user ID is strictly extracted from verified JWT claims in the Authorization header.
"""

import os
import logging
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.models.workspace import User
from src.auth.jwt_validator import SupabaseJWTValidator, JWTValidationError

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

_default_validator: Optional[SupabaseJWTValidator] = None


def get_jwt_validator() -> SupabaseJWTValidator:
    """Get or create singleton JWT validator."""
    global _default_validator
    if _default_validator is None:
        _default_validator = SupabaseJWTValidator()
    return _default_validator


def set_jwt_validator(validator: Optional[SupabaseJWTValidator]) -> None:
    """Set custom JWT validator (useful for testing)."""
    global _default_validator
    _default_validator = validator


def get_jwt_secret() -> Optional[str]:
    """Retrieve Supabase JWT secret from environment."""
    return os.getenv("SUPABASE_JWT_SECRET")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> User:
    """Validate Supabase JWT and return authenticated User.
    
    Supports ES256 via Supabase JWKS endpoint and HS256 via shared secret.
    Raises HTTP 401 if token is missing, invalid, or expired.
    Raises HTTP 500 if server configuration is invalid.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    validator = get_jwt_validator()

    try:
        payload = validator.validate_token(token)
    except JWTValidationError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject (user_id).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return User(
        id=str(user_id),
        email=payload.get("email"),
        role=payload.get("role"),
    )
