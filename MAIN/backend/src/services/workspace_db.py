"""Database service for managing projects and workflows with Supabase and isolated test mode.

Architecture:
- Production Mode (default when Supabase configured): Direct requests to Supabase PostgREST
  with user's verified Bearer JWT. Full RLS enforcement. All database errors bubble up.
  NO SILENT IN-MEMORY FALLBACK.
- Test Mode (when SUPABASE_MODE=test or unit testing): Strict in-memory RLS simulation.
"""

import os
import uuid
import datetime
import logging
from typing import Any, Optional
import httpx
from fastapi import HTTPException, status

from src.models.workspace import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    User,
    WorkflowCreate,
    WorkflowResponse,
    WorkflowUpdate,
)

logger = logging.getLogger(__name__)

# In-memory storage strictly for isolated unit testing
_IN_MEMORY_PROJECTS: dict[str, dict[str, Any]] = {}
_IN_MEMORY_WORKFLOWS: dict[str, dict[str, Any]] = {}


def _get_supabase_config() -> tuple[Optional[str], Optional[str]]:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    return url, anon_key


def is_supabase_enabled() -> bool:
    """Determine whether database operations must target Supabase or test mock."""
    mode = os.getenv("SUPABASE_MODE", "auto").lower()
    if mode == "test":
        return False
    if mode == "production":
        return True

    # In unit tests without explicit TEST_SUPABASE=1 flag, isolate with in-memory store
    if (os.getenv("TESTING") == "true" or os.getenv("PYTEST_CURRENT_TEST")) and os.getenv("TEST_SUPABASE") != "1":
        return False

    url, anon_key = _get_supabase_config()
    return bool(url and anon_key)


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _handle_supabase_error(res: httpx.Response, action_description: str) -> None:
    """Parse PostgREST/Supabase error response and raise appropriate HTTPException.
    
    Prevents silent failure or masked errors.
    """
    try:
        data = res.json()
        if isinstance(data, list) and data:
            data = data[0]
        msg = data.get("message") or data.get("details") or res.text
        code = data.get("code")
    except Exception:
        msg = res.text
        code = None

    logger.error(
        f"Supabase error during '{action_description}': "
        f"status={res.status_code}, code={code}, detail={msg}"
    )

    if res.status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Database session expired or invalid credentials.",
        )
    elif res.status_code == 403:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied (RLS policy violation): {msg}",
        )
    elif res.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource not found in database: {msg}",
        )
    elif res.status_code in (400, 422):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database request rejected: {msg}",
        )
    elif res.status_code == 409:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Database conflict: {msg}",
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Supabase returned error ({res.status_code}): {msg}",
        )


# ── Projects Service ─────────────────────────────────────────────────────────

async def list_user_projects(user: User, token: Optional[str] = None) -> list[ProjectResponse]:
    """List projects owned by the authenticated user."""
    if is_supabase_enabled():
        url, anon_key = _get_supabase_config()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required for database operations.",
            )

        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"{url}/rest/v1/projects?select=*,workflows(count)&order=updated_at.desc",
                    headers={
                        "apikey": anon_key,
                        "Authorization": f"Bearer {token}",
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    projects = []
                    for item in data:
                        wf_list = item.get("workflows")
                        wf_count = wf_list[0].get("count", 0) if isinstance(wf_list, list) and wf_list else 0
                        projects.append(
                            ProjectResponse(
                                id=item["id"],
                                user_id=item["user_id"],
                                name=item["name"],
                                created_at=item["created_at"],
                                updated_at=item["updated_at"],
                                workflow_count=wf_count,
                            )
                        )
                    return projects
                else:
                    _handle_supabase_error(res, "list_user_projects")
        except httpx.RequestError as e:
            logger.error(f"Network error querying Supabase: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to Supabase: {str(e)}",
            )

    # Isolated Test Mode (Strict RLS: only user's projects)
    user_projects = []
    for p in _IN_MEMORY_PROJECTS.values():
        if p["user_id"] == user.id:
            wf_count = sum(1 for w in _IN_MEMORY_WORKFLOWS.values() if w["project_id"] == p["id"])
            user_projects.append(
                ProjectResponse(
                    id=p["id"],
                    user_id=p["user_id"],
                    name=p["name"],
                    created_at=p["created_at"],
                    updated_at=p["updated_at"],
                    workflow_count=wf_count,
                )
            )
    return sorted(user_projects, key=lambda x: x.created_at, reverse=True)


async def create_user_project(user: User, data: ProjectCreate, token: Optional[str] = None) -> ProjectResponse:
    """Create a new project for the authenticated user."""
    if is_supabase_enabled():
        url, anon_key = _get_supabase_config()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required for database operations.",
            )

        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{url}/rest/v1/projects",
                    headers={
                        "apikey": anon_key,
                        "Authorization": f"Bearer {token}",
                        "Prefer": "return=representation",
                    },
                    json={"name": data.name, "user_id": user.id},
                )
                if res.status_code in (200, 201):
                    items = res.json()
                    item = items[0]
                    return ProjectResponse(
                        id=item["id"],
                        user_id=item["user_id"],
                        name=item["name"],
                        created_at=item["created_at"],
                        updated_at=item["updated_at"],
                        workflow_count=0,
                    )
                else:
                    _handle_supabase_error(res, "create_user_project")
        except httpx.RequestError as e:
            logger.error(f"Network error creating Supabase project: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to Supabase: {str(e)}",
            )

    # Isolated Test Mode
    proj_id = str(uuid.uuid4())
    now = _now_iso()
    new_proj = {
        "id": proj_id,
        "user_id": user.id,
        "name": data.name,
        "created_at": now,
        "updated_at": now,
    }
    _IN_MEMORY_PROJECTS[proj_id] = new_proj
    return ProjectResponse(
        id=proj_id,
        user_id=user.id,
        name=data.name,
        created_at=now,
        updated_at=now,
        workflow_count=0,
    )


async def get_user_project(project_id: str, user: User, token: Optional[str] = None) -> Optional[ProjectResponse]:
    """Retrieve a project ensuring user ownership (RLS)."""
    if is_supabase_enabled():
        url, anon_key = _get_supabase_config()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required for database operations.",
            )

        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"{url}/rest/v1/projects?id=eq.{project_id}",
                    headers={
                        "apikey": anon_key,
                        "Authorization": f"Bearer {token}",
                    },
                )
                if res.status_code == 200:
                    items = res.json()
                    if items:
                        item = items[0]
                        return ProjectResponse(
                            id=item["id"],
                            user_id=item["user_id"],
                            name=item["name"],
                            created_at=item["created_at"],
                            updated_at=item["updated_at"],
                        )
                    return None
                else:
                    _handle_supabase_error(res, "get_user_project")
        except httpx.RequestError as e:
            logger.error(f"Network error querying Supabase project: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to Supabase: {str(e)}",
            )

    # Isolated Test Mode
    proj = _IN_MEMORY_PROJECTS.get(project_id)
    if not proj or proj["user_id"] != user.id:
        return None
    wf_count = sum(1 for w in _IN_MEMORY_WORKFLOWS.values() if w["project_id"] == project_id)
    return ProjectResponse(
        id=proj["id"],
        user_id=proj["user_id"],
        name=proj["name"],
        created_at=proj["created_at"],
        updated_at=proj["updated_at"],
        workflow_count=wf_count,
    )


async def update_user_project(
    project_id: str, data: ProjectUpdate, user: User, token: Optional[str] = None
) -> Optional[ProjectResponse]:
    """Update project name ensuring user ownership (RLS)."""
    if is_supabase_enabled():
        url, anon_key = _get_supabase_config()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required for database operations.",
            )

        try:
            async with httpx.AsyncClient() as client:
                res = await client.patch(
                    f"{url}/rest/v1/projects?id=eq.{project_id}",
                    headers={
                        "apikey": anon_key,
                        "Authorization": f"Bearer {token}",
                        "Prefer": "return=representation",
                    },
                    json={"name": data.name},
                )
                if res.status_code == 200:
                    items = res.json()
                    if items:
                        item = items[0]
                        return ProjectResponse(
                            id=item["id"],
                            user_id=item["user_id"],
                            name=item["name"],
                            created_at=item["created_at"],
                            updated_at=item["updated_at"],
                        )
                    return None
                else:
                    _handle_supabase_error(res, "update_user_project")
        except httpx.RequestError as e:
            logger.error(f"Network error updating Supabase project: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to Supabase: {str(e)}",
            )

    # Isolated Test Mode
    proj = _IN_MEMORY_PROJECTS.get(project_id)
    if not proj or proj["user_id"] != user.id:
        return None
    proj["name"] = data.name
    proj["updated_at"] = _now_iso()
    return ProjectResponse(
        id=proj["id"],
        user_id=proj["user_id"],
        name=proj["name"],
        created_at=proj["created_at"],
        updated_at=proj["updated_at"],
    )


async def delete_user_project(project_id: str, user: User, token: Optional[str] = None) -> bool:
    """Delete a project and its workflows ensuring user ownership (RLS)."""
    if is_supabase_enabled():
        url, anon_key = _get_supabase_config()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required for database operations.",
            )

        try:
            async with httpx.AsyncClient() as client:
                res = await client.delete(
                    f"{url}/rest/v1/projects?id=eq.{project_id}",
                    headers={
                        "apikey": anon_key,
                        "Authorization": f"Bearer {token}",
                        "Prefer": "return=representation",
                    },
                )
                if res.status_code in (200, 204):
                    items = res.json() if res.status_code == 200 else []
                    return len(items) > 0
                else:
                    _handle_supabase_error(res, "delete_user_project")
        except httpx.RequestError as e:
            logger.error(f"Network error deleting Supabase project: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to Supabase: {str(e)}",
            )

    # Isolated Test Mode
    proj = _IN_MEMORY_PROJECTS.get(project_id)
    if not proj or proj["user_id"] != user.id:
        return False
    wfs_to_del = [w_id for w_id, w in _IN_MEMORY_WORKFLOWS.items() if w["project_id"] == project_id]
    for w_id in wfs_to_del:
        del _IN_MEMORY_WORKFLOWS[w_id]
    del _IN_MEMORY_PROJECTS[project_id]
    return True


# ── Workflows Service ────────────────────────────────────────────────────────

async def list_project_workflows(
    project_id: str, user: User, token: Optional[str] = None
) -> list[WorkflowResponse]:
    """List workflows in a project ensuring user ownership (RLS)."""
    if is_supabase_enabled():
        url, anon_key = _get_supabase_config()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required for database operations.",
            )

        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"{url}/rest/v1/workflows?project_id=eq.{project_id}&order=updated_at.desc",
                    headers={
                        "apikey": anon_key,
                        "Authorization": f"Bearer {token}",
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    return [
                        WorkflowResponse(
                            id=item["id"],
                            project_id=item["project_id"],
                            user_id=item["user_id"],
                            name=item["name"],
                            graph_json=item.get("graph_json") or {"nodes": [], "edges": []},
                            created_at=item["created_at"],
                            updated_at=item["updated_at"],
                        )
                        for item in data
                    ]
                else:
                    _handle_supabase_error(res, "list_project_workflows")
        except httpx.RequestError as e:
            logger.error(f"Network error listing Supabase workflows: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to Supabase: {str(e)}",
            )

    # Isolated Test Mode
    proj = _IN_MEMORY_PROJECTS.get(project_id)
    if not proj or proj["user_id"] != user.id:
        return []

    wfs = [
        WorkflowResponse(
            id=w["id"],
            project_id=w["project_id"],
            user_id=w["user_id"],
            name=w["name"],
            graph_json=w["graph_json"],
            created_at=w["created_at"],
            updated_at=w["updated_at"],
        )
        for w in _IN_MEMORY_WORKFLOWS.values()
        if w["project_id"] == project_id and w["user_id"] == user.id
    ]
    return sorted(wfs, key=lambda x: x.updated_at, reverse=True)


async def create_project_workflow(
    project_id: str, data: WorkflowCreate, user: User, token: Optional[str] = None
) -> Optional[WorkflowResponse]:
    """Create a new workflow in project ensuring user ownership (RLS)."""
    project = await get_user_project(project_id, user, token)
    if not project:
        return None

    graph_content = data.graph_json or {"nodes": [], "edges": []}

    if is_supabase_enabled():
        url, anon_key = _get_supabase_config()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required for database operations.",
            )

        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{url}/rest/v1/workflows",
                    headers={
                        "apikey": anon_key,
                        "Authorization": f"Bearer {token}",
                        "Prefer": "return=representation",
                    },
                    json={
                        "project_id": project_id,
                        "user_id": user.id,
                        "name": data.name,
                        "graph_json": graph_content,
                    },
                )
                if res.status_code in (200, 201):
                    item = res.json()[0]
                    return WorkflowResponse(
                        id=item["id"],
                        project_id=item["project_id"],
                        user_id=item["user_id"],
                        name=item["name"],
                        graph_json=item["graph_json"],
                        created_at=item["created_at"],
                        updated_at=item["updated_at"],
                    )
                else:
                    _handle_supabase_error(res, "create_project_workflow")
        except httpx.RequestError as e:
            logger.error(f"Network error creating Supabase workflow: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to Supabase: {str(e)}",
            )

    # Isolated Test Mode
    wf_id = str(uuid.uuid4())
    now = _now_iso()
    new_wf = {
        "id": wf_id,
        "project_id": project_id,
        "user_id": user.id,
        "name": data.name,
        "graph_json": graph_content,
        "created_at": now,
        "updated_at": now,
    }
    _IN_MEMORY_WORKFLOWS[wf_id] = new_wf
    return WorkflowResponse(
        id=wf_id,
        project_id=project_id,
        user_id=user.id,
        name=data.name,
        graph_json=graph_content,
        created_at=now,
        updated_at=now,
    )


async def get_user_workflow(
    workflow_id: str, user: User, token: Optional[str] = None
) -> Optional[WorkflowResponse]:
    """Retrieve a single workflow verifying user ownership (RLS)."""
    if is_supabase_enabled():
        url, anon_key = _get_supabase_config()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required for database operations.",
            )

        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"{url}/rest/v1/workflows?id=eq.{workflow_id}",
                    headers={
                        "apikey": anon_key,
                        "Authorization": f"Bearer {token}",
                    },
                )
                if res.status_code == 200:
                    items = res.json()
                    if items:
                        item = items[0]
                        return WorkflowResponse(
                            id=item["id"],
                            project_id=item["project_id"],
                            user_id=item["user_id"],
                            name=item["name"],
                            graph_json=item["graph_json"],
                            created_at=item["created_at"],
                            updated_at=item["updated_at"],
                        )
                    return None
                else:
                    _handle_supabase_error(res, "get_user_workflow")
        except httpx.RequestError as e:
            logger.error(f"Network error querying Supabase workflow: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to Supabase: {str(e)}",
            )

    # Isolated Test Mode
    wf = _IN_MEMORY_WORKFLOWS.get(workflow_id)
    if not wf or wf["user_id"] != user.id:
        return None
    return WorkflowResponse(
        id=wf["id"],
        project_id=wf["project_id"],
        user_id=wf["user_id"],
        name=wf["name"],
        graph_json=wf["graph_json"],
        created_at=wf["created_at"],
        updated_at=wf["updated_at"],
    )


async def update_user_workflow(
    workflow_id: str, data: WorkflowUpdate, user: User, token: Optional[str] = None
) -> Optional[WorkflowResponse]:
    """Update workflow name and/or graph_json verifying user ownership (RLS)."""
    update_payload: dict[str, Any] = {}
    if data.name is not None:
        update_payload["name"] = data.name
    if data.graph_json is not None:
        update_payload["graph_json"] = data.graph_json

    if not update_payload:
        return await get_user_workflow(workflow_id, user, token)

    if is_supabase_enabled():
        url, anon_key = _get_supabase_config()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required for database operations.",
            )

        try:
            async with httpx.AsyncClient() as client:
                res = await client.patch(
                    f"{url}/rest/v1/workflows?id=eq.{workflow_id}",
                    headers={
                        "apikey": anon_key,
                        "Authorization": f"Bearer {token}",
                        "Prefer": "return=representation",
                    },
                    json=update_payload,
                )
                if res.status_code == 200:
                    items = res.json()
                    if items:
                        item = items[0]
                        return WorkflowResponse(
                            id=item["id"],
                            project_id=item["project_id"],
                            user_id=item["user_id"],
                            name=item["name"],
                            graph_json=item["graph_json"],
                            created_at=item["created_at"],
                            updated_at=item["updated_at"],
                        )
                    return None
                else:
                    _handle_supabase_error(res, "update_user_workflow")
        except httpx.RequestError as e:
            logger.error(f"Network error updating Supabase workflow: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to Supabase: {str(e)}",
            )

    # Isolated Test Mode
    wf = _IN_MEMORY_WORKFLOWS.get(workflow_id)
    if not wf or wf["user_id"] != user.id:
        return None

    if data.name is not None:
        wf["name"] = data.name
    if data.graph_json is not None:
        wf["graph_json"] = data.graph_json
    wf["updated_at"] = _now_iso()

    return WorkflowResponse(
        id=wf["id"],
        project_id=wf["project_id"],
        user_id=wf["user_id"],
        name=wf["name"],
        graph_json=wf["graph_json"],
        created_at=wf["created_at"],
        updated_at=wf["updated_at"],
    )


async def delete_user_workflow(
    workflow_id: str, user: User, token: Optional[str] = None
) -> bool:
    """Delete a workflow verifying user ownership (RLS)."""
    if is_supabase_enabled():
        url, anon_key = _get_supabase_config()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required for database operations.",
            )

        try:
            async with httpx.AsyncClient() as client:
                res = await client.delete(
                    f"{url}/rest/v1/workflows?id=eq.{workflow_id}",
                    headers={
                        "apikey": anon_key,
                        "Authorization": f"Bearer {token}",
                        "Prefer": "return=representation",
                    },
                )
                if res.status_code in (200, 204):
                    items = res.json() if res.status_code == 200 else []
                    return len(items) > 0
                else:
                    _handle_supabase_error(res, "delete_user_workflow")
        except httpx.RequestError as e:
            logger.error(f"Network error deleting Supabase workflow: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to Supabase: {str(e)}",
            )

    # Isolated Test Mode
    wf = _IN_MEMORY_WORKFLOWS.get(workflow_id)
    if not wf or wf["user_id"] != user.id:
        return False
    del _IN_MEMORY_WORKFLOWS[workflow_id]
    return True
