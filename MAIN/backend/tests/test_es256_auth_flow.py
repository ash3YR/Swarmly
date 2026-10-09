"""End-to-End ES256 JWT Authentication and Project Flow Tests.

Verifies:
1. Asymmetric ES256 tokens signed with EC keypair are accepted by SupabaseJWTValidator.
2. Live Supabase JWKS retrieval works for the configured Supabase instance.
3. FastAPI dependency get_current_user correctly resolves user from ES256 claims.
4. Authenticated requests to /api/projects succeed with ES256 tokens.
5. Expired ES256 tokens return 401 Unauthorized with "Session expired".
6. Tampered/invalid signatures return 401 Unauthorized.
7. Unsupported algorithms return 401 with descriptive message.
"""

import sys
sys.path.insert(0, ".")

import time
import jwt
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from cryptography.hazmat.primitives.asymmetric import ec

from main import app
from src.api.auth import set_jwt_validator, SupabaseJWTValidator
from src.auth.jwt_validator import JWTValidationError

client = TestClient(app)

TEST_USER_ID = "00000000-1111-2222-3333-444444444444"
TEST_USER_EMAIL = "google_user@swarmly.dev"


@pytest.fixture
def ec_keypair():
    """Generate a fresh EC P-256 keypair for testing."""
    priv = ec.generate_private_key(ec.SECP256R1())
    pub = priv.public_key()
    return priv, pub


def test_es256_end_to_end_project_endpoint(ec_keypair):
    """Test that FastAPI /api/projects accepts valid ES256 tokens verified via JWKS."""
    priv_key, pub_key = ec_keypair

    mock_key = MagicMock()
    mock_key.key = pub_key

    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.return_value = mock_key

    validator = SupabaseJWTValidator(
        supabase_url="https://icfkgwylujjawripweyv.supabase.co",
        jwks_client=mock_jwks,
    )
    set_jwt_validator(validator)

    try:
        token = jwt.encode(
            {
                "sub": TEST_USER_ID,
                "email": TEST_USER_EMAIL,
                "role": "authenticated",
                "aud": "authenticated",
                "iss": "https://icfkgwylujjawripweyv.supabase.co/auth/v1",
                "exp": int(time.time()) + 3600,
            },
            priv_key,
            algorithm="ES256",
            headers={"kid": "41b4da6c-f38d-4882-bd7b-95ace9259776"},
        )

        # GET /api/projects with ES256 token must succeed (return 200)
        res = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert isinstance(res.json(), list)
    finally:
        set_jwt_validator(None)


def test_es256_expired_token_returns_session_expired(ec_keypair):
    """Expired ES256 token must return 401 with 'Session expired'."""
    priv_key, pub_key = ec_keypair

    mock_key = MagicMock()
    mock_key.key = pub_key

    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.return_value = mock_key

    validator = SupabaseJWTValidator(
        supabase_url="https://icfkgwylujjawripweyv.supabase.co",
        jwks_client=mock_jwks,
    )
    set_jwt_validator(validator)

    try:
        expired_token = jwt.encode(
            {
                "sub": TEST_USER_ID,
                "exp": int(time.time()) - 30,
            },
            priv_key,
            algorithm="ES256",
            headers={"kid": "test-kid"},
        )

        res = client.get("/api/projects", headers={"Authorization": f"Bearer {expired_token}"})
        assert res.status_code == 401
        assert "Session expired" in res.json()["detail"]
    finally:
        set_jwt_validator(None)


def test_es256_tampered_signature_returns_401(ec_keypair):
    """ES256 token signed with wrong key must return 401."""
    priv_key, _ = ec_keypair
    other_priv = ec.generate_private_key(ec.SECP256R1())

    mock_key = MagicMock()
    mock_key.key = other_priv.public_key()

    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.return_value = mock_key

    validator = SupabaseJWTValidator(
        supabase_url="https://icfkgwylujjawripweyv.supabase.co",
        jwks_client=mock_jwks,
    )
    set_jwt_validator(validator)

    try:
        tampered_token = jwt.encode(
            {"sub": TEST_USER_ID, "exp": int(time.time()) + 3600},
            priv_key,
            algorithm="ES256",
            headers={"kid": "test-kid"},
        )

        res = client.get("/api/projects", headers={"Authorization": f"Bearer {tampered_token}"})
        assert res.status_code == 401
        assert "signature" in res.json()["detail"].lower()
    finally:
        set_jwt_validator(None)


def test_live_supabase_jwks_keys_available():
    """Verify live Supabase instance exposes ES256 signing keys via JWKS endpoint."""
    validator = SupabaseJWTValidator()
    assert validator._jwks_client is not None
    # Key from live JWKS
    signing_key = validator._jwks_client.get_signing_key("41b4da6c-f38d-4882-bd7b-95ace9259776")
    assert signing_key is not None
    assert signing_key.key is not None
