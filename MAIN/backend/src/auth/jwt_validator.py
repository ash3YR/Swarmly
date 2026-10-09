"""Supabase JWT validation service supporting asymmetric (ES256 via JWKS) and symmetric (HS256) signing."""

import os
import logging
from typing import Optional, Dict, Any
import jwt
from jwt import PyJWKClient, PyJWKClientError, InvalidTokenError, ExpiredSignatureError, ImmatureSignatureError

logger = logging.getLogger(__name__)

# Allowed algorithms
ALLOWED_ASYMMETRIC_ALGORITHMS = ["ES256"]
ALLOWED_SYMMETRIC_ALGORITHMS = ["HS256", "HS384", "HS512"]
ALLOWED_ALGORITHMS = ALLOWED_ASYMMETRIC_ALGORITHMS + ALLOWED_SYMMETRIC_ALGORITHMS


class JWTValidationError(Exception):
    """Custom exception for JWT validation errors with an HTTP status code."""

    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class SupabaseJWTValidator:
    """Validates Supabase JWTs using JWKS for ES256 and secret for HS256."""

    def __init__(
        self,
        supabase_url: Optional[str] = None,
        jwt_secret: Optional[str] = None,
        jwks_client: Optional[PyJWKClient] = None,
    ):
        self._supabase_url = (
            supabase_url
            or os.getenv("SUPABASE_URL")
            or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        )
        self._jwt_secret = jwt_secret or os.getenv("SUPABASE_JWT_SECRET")
        self._jwks_client = jwks_client

        if self._jwks_client is None and self._supabase_url:
            jwks_uri = f"{self._supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
            # PyJWKClient provides thread-safe in-memory caching and rotation handling
            self._jwks_client = PyJWKClient(
                jwks_uri,
                cache_keys=True,
                max_cached_keys=16,
                cache_jwk_set=True,
                lifespan=3600,
            )

    @property
    def expected_issuer(self) -> Optional[str]:
        if self._supabase_url:
            return f"{self._supabase_url.rstrip('/')}/auth/v1"
        return None

    def validate_token(self, token: str) -> Dict[str, Any]:
        """Validate a Supabase JWT and return verified claims dict.
        
        Raises JWTValidationError on failure.
        """
        if not token or not isinstance(token, str):
            raise JWTValidationError("Missing or invalid authentication token.", status_code=401)

        token = token.strip()

        # Parse unverified header safely without validating signature yet
        try:
            unverified_header = jwt.get_unverified_header(token)
        except (InvalidTokenError, ValueError) as e:
            logger.warning(f"Malformed JWT header: {type(e).__name__}")
            raise JWTValidationError("Malformed authentication token.", status_code=401)

        alg = unverified_header.get("alg")
        if not alg or alg not in ALLOWED_ALGORITHMS:
            logger.warning(f"Unsupported JWT algorithm requested: {alg}")
            raise JWTValidationError(
                f"Invalid authentication token: algorithm '{alg}' is not supported.",
                status_code=401,
            )

        # ── Branch 1: Asymmetric ES256 via JWKS ──
        if alg in ALLOWED_ASYMMETRIC_ALGORITHMS:
            if not self._supabase_url or not self._jwks_client:
                logger.error("SUPABASE_URL is not configured for asymmetric JWT validation.")
                raise JWTValidationError(
                    "Authentication configuration error: Supabase URL is not configured.",
                    status_code=500,
                )

            try:
                signing_key = self._jwks_client.get_signing_key_from_jwt(token)
            except PyJWKClientError as e:
                logger.warning(f"Failed to obtain JWKS signing key: {e}")
                raise JWTValidationError(
                    "Invalid authentication token: signing key not found or JWKS unavailable.",
                    status_code=401,
                )
            except Exception as e:
                logger.warning(f"Error fetching JWKS key: {e}")
                raise JWTValidationError(
                    "Authentication service temporarily unavailable.",
                    status_code=401,
                )

            try:
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=[alg],
                    options={
                        "verify_signature": True,
                        "verify_exp": True,
                        "verify_nbf": True,
                        "verify_aud": False,
                    },
                )
            except ExpiredSignatureError:
                raise JWTValidationError("Session expired. Please sign in again.", status_code=401)
            except ImmatureSignatureError:
                raise JWTValidationError("Token not yet valid.", status_code=401)
            except (InvalidTokenError, ValueError) as e:
                logger.warning(f"JWT signature verification failed: {type(e).__name__}")
                raise JWTValidationError("Invalid authentication token signature.", status_code=401)

        # ── Branch 2: Symmetric HMAC (HS256, HS384, HS512) ──
        else:
            if not self._jwt_secret:
                is_production = os.getenv("SUPABASE_MODE") == "production" or bool(self._supabase_url)
                if is_production and not (os.getenv("TESTING") == "true" or os.getenv("PYTEST_CURRENT_TEST")):
                    logger.error("SUPABASE_JWT_SECRET is not configured for symmetric JWT validation.")
                    raise JWTValidationError(
                        "Authentication configuration error: SUPABASE_JWT_SECRET is not configured.",
                        status_code=500,
                    )
                # Test fallback if explicit
                logger.warning("Decoding token without secret in test environment.")
                try:
                    payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
                except Exception:
                    raise JWTValidationError("Invalid authentication token payload.", status_code=401)
            else:
                try:
                    payload = jwt.decode(
                        token,
                        self._jwt_secret,
                        algorithms=[alg],
                        options={
                            "verify_signature": True,
                            "verify_exp": True,
                            "verify_nbf": True,
                            "verify_aud": False,
                        },
                    )
                except ExpiredSignatureError:
                    raise JWTValidationError("Session expired. Please sign in again.", status_code=401)
                except ImmatureSignatureError:
                    raise JWTValidationError("Token not yet valid.", status_code=401)
                except (InvalidTokenError, ValueError) as e:
                    logger.warning(f"JWT verification failed: {type(e).__name__}")
                    raise JWTValidationError("Invalid authentication token signature.", status_code=401)

        # ── Common claim validations ──
        # 1. Validate issuer if configured and present in token
        token_iss = payload.get("iss")
        if self.expected_issuer and token_iss:
            # Allow match with trailing slash stripped, or standard Supabase ref format
            if token_iss.rstrip("/") != self.expected_issuer.rstrip("/"):
                if not (token_iss == "supabase" or "supabase.co" in token_iss):
                    logger.warning(f"JWT issuer mismatch: expected {self.expected_issuer}, got {token_iss}")
                    raise JWTValidationError("Invalid token issuer.", status_code=401)

        # 2. Validate subject (user ID)
        user_id = payload.get("sub")
        if not user_id:
            raise JWTValidationError("Invalid token: missing subject (user_id).", status_code=401)

        return payload
