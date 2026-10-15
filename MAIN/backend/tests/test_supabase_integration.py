"""Real Supabase Integration and RLS Verification Tests.

These tests hit the LIVE Supabase PostgreSQL instance configured in .env.
They explicitly verify:
1. Real project creation and listing via FastAPI endpoints.
2. Real workflow creation, retrieval, updating, and deletion in PostgreSQL.
3. Strict Row-Level Security (RLS) isolation: User B cannot read, update, or delete User A's data.
"""

import sys
sys.path.insert(0, ".")

import os
import time
import jwt
import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.auth import get_jwt_secret

client = TestClient(app)

# Real Supabase credentials from environment
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY")
JWT_SECRET = get_jwt_secret()

pytestmark = pytest.mark.skipif(
    not (SUPABASE_URL and SUPABASE_KEY and JWT_SECRET),
    reason="Supabase environment variables not configured in .env",
)

# User A is registered in Supabase auth.users
USER_A_ID = "a780b563-4fea-43e6-a265-c9d739fd583f"
USER_A_EMAIL = "swarmly_usera_991@gmail.com"

# User B is a distinct authenticated identity
USER_B_ID = "b880b563-4fea-43e6-a265-c9d739fd583f"
USER_B_EMAIL = "swarmly_userb_test@gmail.com"


def get_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "role": "authenticated",
        "aud": "authenticated",
        "email": email,
        "exp": int(time.time()) + 3600,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@pytest.fixture(autouse=True)
def enable_production_supabase(monkeypatch):
    """Ensure tests run against real Supabase, not test mock."""
    monkeypatch.setenv("SUPABASE_MODE", "production")
    monkeypatch.setenv("TEST_SUPABASE", "1")


def test_real_supabase_project_lifecycle():
    """Verify project creation, retrieval, and deletion against live Supabase PostgreSQL."""
    token_a = get_token(USER_A_ID, USER_A_EMAIL)
    headers = {"Authorization": f"Bearer {token_a}"}

    project_name = f"Integration Test Project {int(time.time())}"

    # 1. Create project
    create_res = client.post("/api/projects", json={"name": project_name}, headers=headers)
    assert create_res.status_code == 201, f"Create failed: {create_res.text}"
    project = create_res.json()
    project_id = project["id"]
    assert project["name"] == project_name
    assert project["user_id"] == USER_A_ID

    # 2. List projects - must include the new project
    list_res = client.get("/api/projects", headers=headers)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert any(p["id"] == project_id for p in projects)

    # 3. Update project name
    updated_name = f"{project_name} - Renamed"
    update_res = client.patch(f"/api/projects/{project_id}", json={"name": updated_name}, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == updated_name

    # 4. Clean up / Delete project
    del_res = client.delete(f"/api/projects/{project_id}", headers=headers)
    assert del_res.status_code == 204

    # 5. Verify deletion
    get_res = client.get(f"/api/projects/{project_id}", headers=headers)
    assert get_res.status_code == 404


def test_real_supabase_workflow_crud():
    """Verify workflow creation, graph persistence, and retrieval against live Supabase."""
    token_a = get_token(USER_A_ID, USER_A_EMAIL)
    headers = {"Authorization": f"Bearer {token_a}"}

    # Create parent project
    proj_res = client.post("/api/projects", json={"name": f"Workflow Test Proj {int(time.time())}"}, headers=headers)
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    try:
        # Create workflow with graph_json
        graph_data = {
            "nodes": [
                {"id": "agent-1", "type": "llm_agent", "data": {"label": "Research Agent"}},
                {"id": "tool-1", "type": "tool", "data": {"label": "Tavily Search"}},
            ],
            "edges": [
                {"id": "e1", "source": "agent-1", "target": "tool-1"},
            ],
        }
        wf_res = client.post(
            f"/api/projects/{proj_id}/workflows",
            json={"name": "Research Workflow", "graph_json": graph_data},
            headers=headers,
        )
        assert wf_res.status_code == 201
        wf = wf_res.json()
        wf_id = wf["id"]
        assert wf["project_id"] == proj_id
        assert len(wf["graph_json"]["nodes"]) == 2

        # Retrieve workflow directly
        get_wf = client.get(f"/api/workflows/{wf_id}", headers=headers)
        assert get_wf.status_code == 200
        assert get_wf.json()["name"] == "Research Workflow"

        # Update workflow graph
        updated_graph = {
            "nodes": [
                {"id": "agent-1", "type": "llm_agent", "data": {"label": "Research Agent"}},
                {"id": "tool-1", "type": "tool", "data": {"label": "Tavily Search"}},
                {"id": "agent-2", "type": "llm_agent", "data": {"label": "Writer Agent"}},
            ],
            "edges": [],
        }
        patch_wf = client.patch(
            f"/api/workflows/{wf_id}",
            json={"name": "Updated Workflow", "graph_json": updated_graph},
            headers=headers,
        )
        assert patch_wf.status_code == 200
        assert len(patch_wf.json()["graph_json"]["nodes"]) == 3

        # Delete workflow
        del_wf = client.delete(f"/api/workflows/{wf_id}", headers=headers)
        assert del_wf.status_code == 204

    finally:
        # Cleanup parent project (cascades)
        client.delete(f"/api/projects/{proj_id}", headers=headers)


def test_real_supabase_rls_isolation_between_two_users():
    """Verify PostgreSQL Row-Level Security: User B cannot access User A's data."""
    token_a = get_token(USER_A_ID, USER_A_EMAIL)
    token_b = get_token(USER_B_ID, USER_B_EMAIL)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a secret project
    proj_a = client.post(
        "/api/projects",
        json={"name": f"User A Secret Project {int(time.time())}"},
        headers=headers_a,
    ).json()
    proj_a_id = proj_a["id"]

    try:
        # User A creates a secret workflow
        wf_a = client.post(
            f"/api/projects/{proj_a_id}/workflows",
            json={"name": "Top Secret Workflow", "graph_json": {"nodes": [{"id": "n1"}], "edges": []}},
            headers=headers_a,
        ).json()
        wf_a_id = wf_a["id"]

        # ── User B attempts unauthorized operations ──

        # 1. User B lists projects - User A's project must NOT be present
        list_b = client.get("/api/projects", headers=headers_b)
        assert list_b.status_code == 200
        assert not any(p["id"] == proj_a_id for p in list_b.json())

        # 2. User B tries to get User A's project by ID - must return 404
        get_b_proj = client.get(f"/api/projects/{proj_a_id}", headers=headers_b)
        assert get_b_proj.status_code == 404

        # 3. User B tries to update User A's project - must return 404
        patch_b_proj = client.patch(f"/api/projects/{proj_a_id}", json={"name": "Hacked"}, headers=headers_b)
        assert patch_b_proj.status_code == 404

        # 4. User B tries to delete User A's project - must return 404
        del_b_proj = client.delete(f"/api/projects/{proj_a_id}", headers=headers_b)
        assert del_b_proj.status_code == 404

        # 5. User B tries to get User A's workflow - must return 404
        get_b_wf = client.get(f"/api/workflows/{wf_a_id}", headers=headers_b)
        assert get_b_wf.status_code == 404

        # 6. User B tries to update User A's workflow - must return 404
        patch_b_wf = client.patch(
            f"/api/workflows/{wf_a_id}",
            json={"name": "Hacked WF", "graph_json": {"nodes": []}},
            headers=headers_b,
        )
        assert patch_b_wf.status_code == 404

        # 7. User B tries to delete User A's workflow - must return 404
        del_b_wf = client.delete(f"/api/workflows/{wf_a_id}", headers=headers_b)
        assert del_b_wf.status_code == 404

    finally:
        # User A cleans up project
        client.delete(f"/api/projects/{proj_a_id}", headers=headers_a)
