import sys
sys.path.insert(0, ".")

import jwt
import pytest
from fastapi.testclient import TestClient

from main import app
from src.services.workspace_db import _IN_MEMORY_PROJECTS, _IN_MEMORY_WORKFLOWS

from src.api.auth import get_jwt_secret

client = TestClient(app)

USER_A_ID = "11111111-1111-1111-1111-111111111111"
USER_B_ID = "22222222-2222-2222-2222-222222222222"

JWT_KEY = get_jwt_secret() or "test-secret"
TOKEN_A = jwt.encode({"sub": USER_A_ID, "email": "usera@example.com"}, JWT_KEY, algorithm="HS256")
TOKEN_B = jwt.encode({"sub": USER_B_ID, "email": "userb@example.com"}, JWT_KEY, algorithm="HS256")


@pytest.fixture(autouse=True)
def clean_storage():
    """Clear in-memory storage before each test."""
    _IN_MEMORY_PROJECTS.clear()
    _IN_MEMORY_WORKFLOWS.clear()


def test_unauthenticated_request_rejected():
    """Requests without token must be rejected with 401."""
    res = client.get("/api/projects")
    assert res.status_code == 401
    assert "Missing Authorization header" in res.json()["detail"]


def test_invalid_token_rejected():
    """Malformed tokens must be rejected with 401."""
    res = client.get("/api/projects", headers={"Authorization": "Bearer not-a-valid-token"})
    assert res.status_code == 401


def test_user_a_create_and_list_project():
    """User A creates a project and can list it."""
    headers = {"Authorization": f"Bearer {TOKEN_A}"}
    create_res = client.post("/api/projects", json={"name": "Research Project"}, headers=headers)
    assert create_res.status_code == 201
    project = create_res.json()
    assert project["name"] == "Research Project"
    assert project["user_id"] == USER_A_ID

    list_res = client.get("/api/projects", headers=headers)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert len(projects) == 1
    assert projects[0]["id"] == project["id"]


def test_user_b_cannot_access_user_a_project_rls():
    """User B cannot view or access User A's project (Row Level Security)."""
    headers_a = {"Authorization": f"Bearer {TOKEN_A}"}
    headers_b = {"Authorization": f"Bearer {TOKEN_B}"}

    # User A creates a project
    create_res = client.post("/api/projects", json={"name": "Secret Project A"}, headers=headers_a)
    proj_a_id = create_res.json()["id"]

    # User B lists projects - must be empty
    list_b = client.get("/api/projects", headers=headers_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

    # User B attempts to get Project A directly - must return 404 Not Found
    get_b = client.get(f"/api/projects/{proj_a_id}", headers=headers_b)
    assert get_b.status_code == 404

    # User B attempts to update Project A - must return 404 Not Found
    update_b = client.patch(f"/api/projects/{proj_a_id}", json={"name": "Hacked"}, headers=headers_b)
    assert update_b.status_code == 404

    # User B attempts to delete Project A - must return 404 Not Found
    del_b = client.delete(f"/api/projects/{proj_a_id}", headers=headers_b)
    assert del_b.status_code == 404


def test_workflow_lifecycle_and_rls():
    """Full lifecycle: create workflow, save graph_json, and verify RLS isolation."""
    headers_a = {"Authorization": f"Bearer {TOKEN_A}"}
    headers_b = {"Authorization": f"Bearer {TOKEN_B}"}

    # 1. User A creates project
    proj = client.post("/api/projects", json={"name": "AI Pipeline"}, headers=headers_a).json()
    proj_id = proj["id"]

    # 2. User A creates workflow in project
    initial_graph = {
        "nodes": [{"id": "agent-1", "type": "llm_agent", "data": {"label": "Bot"}}],
        "edges": [],
    }
    create_wf = client.post(
        f"/api/projects/{proj_id}/workflows",
        json={"name": "Main Agent Workflow", "graph_json": initial_graph},
        headers=headers_a,
    )
    assert create_wf.status_code == 201
    wf = create_wf.json()
    wf_id = wf["id"]
    assert wf["name"] == "Main Agent Workflow"
    assert wf["graph_json"]["nodes"][0]["id"] == "agent-1"

    # 3. User B cannot view User A's workflow
    assert client.get(f"/api/workflows/{wf_id}", headers=headers_b).status_code == 404
    assert client.get(f"/api/projects/{proj_id}/workflows", headers=headers_b).status_code == 404

    # 4. User A saves updated graph_json
    updated_graph = {
        "nodes": [
            {"id": "agent-1", "type": "llm_agent", "data": {"label": "Bot"}},
            {"id": "tool-1", "type": "tool", "data": {"label": "Search"}},
        ],
        "edges": [{"id": "e1", "source": "agent-1", "target": "tool-1"}],
    }
    save_res = client.put(
        f"/api/workflows/{wf_id}",
        json={"name": "Renamed Workflow", "graph_json": updated_graph},
        headers=headers_a,
    )
    assert save_res.status_code == 200
    saved_wf = save_res.json()
    assert saved_wf["name"] == "Renamed Workflow"
    assert len(saved_wf["graph_json"]["nodes"]) == 2

    # 5. User B cannot save or overwrite User A's workflow
    unauthorized_save = client.put(
        f"/api/workflows/{wf_id}",
        json={"name": "Malicious Overwrite"},
        headers=headers_b,
    )
    assert unauthorized_save.status_code == 404

    # 6. User A deletes workflow
    del_res = client.delete(f"/api/workflows/{wf_id}", headers=headers_a)
    assert del_res.status_code == 204
    assert client.get(f"/api/workflows/{wf_id}", headers=headers_a).status_code == 404
