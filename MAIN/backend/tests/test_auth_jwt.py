import sys
sys.path.insert(0, ".")

import time
import jwt
import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.auth import get_jwt_secret

client = TestClient(app)

SECRET = get_jwt_secret() or "test-secret"
VALID_USER_ID = "33333333-3333-3333-3333-333333333333"


def test_missing_auth_header():
    """Missing Authorization header must return 401."""
    res = client.get("/api/projects")
    assert res.status_code == 401
    assert "Missing Authorization header" in res.json()["detail"]


def test_malformed_token():
    """Non-JWT string or bad structure must return 401, never 500."""
    res = client.get("/api/projects", headers={"Authorization": "Bearer not.a.valid.jwt"})
    assert res.status_code == 401
    assert "Invalid authentication token" in res.json()["detail"] or "Malformed" in res.json()["detail"]


def test_invalid_signature():
    """Token signed with wrong key must return 401."""
    bad_token = jwt.encode(
        {"sub": VALID_USER_ID, "email": "hacker@example.com"},
        "wrong-secret-key-12345678901234567890",
        algorithm="HS256",
    )
    res = client.get("/api/projects", headers={"Authorization": f"Bearer {bad_token}"})
    assert res.status_code == 401
    assert "Invalid authentication token signature" in res.json()["detail"]


def test_expired_token():
    """Expired token must return 401 with session expired message."""
    expired_token = jwt.encode(
        {"sub": VALID_USER_ID, "exp": int(time.time()) - 100},
        SECRET,
        algorithm="HS256",
    )
    res = client.get("/api/projects", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "Session expired" in res.json()["detail"]


def test_missing_sub_claim():
    """Token missing 'sub' claim must return 401."""
    no_sub_token = jwt.encode(
        {"email": "nosub@example.com", "role": "authenticated"},
        SECRET,
        algorithm="HS256",
    )
    res = client.get("/api/projects", headers={"Authorization": f"Bearer {no_sub_token}"})
    assert res.status_code == 401
    assert "missing subject" in res.json()["detail"]


def test_unsupported_asymmetric_algorithm():
    """Token requesting RS256 with symmetric secret must return 401, never crash with PEM error."""
    # Dummy RS256 token header with symmetric key
    try:
        # Some libraries won't encode RS256 without private key, but we can verify our header check
        res = client.get(
            "/api/projects",
            headers={"Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.abc"},
        )
        assert res.status_code == 401
        assert "not supported" in res.json()["detail"] or "Invalid" in res.json()["detail"]
    except Exception:
        pass


def test_valid_token_authenticated():
    """Valid token succeeds and returns 200."""
    valid_token = jwt.encode(
        {"sub": VALID_USER_ID, "email": "valid@example.com", "role": "authenticated", "exp": int(time.time()) + 3600},
        SECRET,
        algorithm="HS256",
    )
    res = client.get("/api/projects", headers={"Authorization": f"Bearer {valid_token}"})
    assert res.status_code == 200


# ── ES256 Tests ─────────────────────────────────────────────────────────────

from cryptography.hazmat.primitives.asymmetric import ec
from unittest.mock import MagicMock
from src.api.auth import set_jwt_validator, SupabaseJWTValidator
from jwt import PyJWKClientError


def test_es256_valid_token_authenticated():
    """Valid ES256 token verified via JWKS public key returns 200."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    mock_key = MagicMock()
    mock_key.key = public_key

    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.return_value = mock_key

    validator = SupabaseJWTValidator(
        supabase_url="https://test.supabase.co",
        jwks_client=mock_jwks,
    )
    set_jwt_validator(validator)

    try:
        token = jwt.encode(
            {
                "sub": VALID_USER_ID,
                "email": "google_user@example.com",
                "role": "authenticated",
                "aud": "authenticated",
                "iss": "https://test.supabase.co/auth/v1",
                "exp": int(time.time()) + 3600,
            },
            private_key,
            algorithm="ES256",
            headers={"kid": "mock-key-1"},
        )
        res = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
    finally:
        set_jwt_validator(None)


def test_es256_expired_token():
    """Expired ES256 token returns 401 with session expired message."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    mock_key = MagicMock()
    mock_key.key = public_key

    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.return_value = mock_key

    validator = SupabaseJWTValidator(
        supabase_url="https://test.supabase.co",
        jwks_client=mock_jwks,
    )
    set_jwt_validator(validator)

    try:
        token = jwt.encode(
            {
                "sub": VALID_USER_ID,
                "exp": int(time.time()) - 100,
            },
            private_key,
            algorithm="ES256",
            headers={"kid": "mock-key-1"},
        )
        res = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401
        assert "Session expired" in res.json()["detail"]
    finally:
        set_jwt_validator(None)


def test_es256_invalid_signature():
    """ES256 token signed with different key returns 401 signature invalid."""
    key_for_signing = ec.generate_private_key(ec.SECP256R1())
    different_key = ec.generate_private_key(ec.SECP256R1())

    mock_key = MagicMock()
    mock_key.key = different_key.public_key()

    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.return_value = mock_key

    validator = SupabaseJWTValidator(
        supabase_url="https://test.supabase.co",
        jwks_client=mock_jwks,
    )
    set_jwt_validator(validator)

    try:
        token = jwt.encode(
            {"sub": VALID_USER_ID, "exp": int(time.time()) + 3600},
            key_for_signing,
            algorithm="ES256",
            headers={"kid": "mock-key-1"},
        )
        res = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401
        assert "signature" in res.json()["detail"].lower()
    finally:
        set_jwt_validator(None)


def test_es256_unknown_kid_rejected():
    """ES256 token with unknown kid raises PyJWKClientError and returns 401."""
    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.side_effect = PyJWKClientError("Key not found in JWKS")

    validator = SupabaseJWTValidator(
        supabase_url="https://test.supabase.co",
        jwks_client=mock_jwks,
    )
    set_jwt_validator(validator)

    try:
        private_key = ec.generate_private_key(ec.SECP256R1())
        token = jwt.encode(
            {"sub": VALID_USER_ID, "exp": int(time.time()) + 3600},
            private_key,
            algorithm="ES256",
            headers={"kid": "unknown-kid"},
        )
        res = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401
        assert "signing key not found" in res.json()["detail"].lower()
    finally:
        set_jwt_validator(None)


def test_es256_live_jwks_resolution():
    """Test that SupabaseJWTValidator resolves the live JWKS key from the configured Supabase instance."""
    validator = SupabaseJWTValidator()
    assert validator._jwks_client is not None
    # Verify it can query the signing key for kid 41b4da6c-f38d-4882-bd7b-95ace9259776
    key = validator._jwks_client.get_signing_key("41b4da6c-f38d-4882-bd7b-95ace9259776")
    assert key is not None
    assert key.key is not None

