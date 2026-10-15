"""API router for managing projects and project workflows."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials

from src.api.auth import get_current_user, security
from src.models.workspace import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    User,
    WorkflowCreate,
    WorkflowResponse,
)
from src.services.workspace_db import (
    create_project_workflow,
    create_user_project,
    delete_user_project,
    get_user_project,
    list_project_workflows,
    list_user_projects,
    update_user_project,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    user: User = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    """List all projects belonging to the authenticated user."""
    token = credentials.credentials if credentials else None
    return await list_user_projects(user, token)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    user: User = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    """Create a new project for the authenticated user."""
    token = credentials.credentials if credentials else None
    return await create_user_project(user, data, token)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user: User = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    """Retrieve a single project ensuring user ownership."""
    token = credentials.credentials if credentials else None
    project = await get_user_project(project_id, user, token)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied.",
        )
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    user: User = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    """Rename a project ensuring user ownership."""
    token = credentials.credentials if credentials else None
    project = await update_user_project(project_id, data, user, token)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied.",
        )
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user: User = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    """Delete a project and its workflows ensuring user ownership."""
    token = credentials.credentials if credentials else None
    success = await delete_user_project(project_id, user, token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied.",
        )
    return None


@router.get("/{project_id}/workflows", response_model=list[WorkflowResponse])
async def get_workflows(
    project_id: str,
    user: User = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    """List all workflows in a project ensuring user ownership."""
    token = credentials.credentials if credentials else None
    project = await get_user_project(project_id, user, token)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied.",
        )
    return await list_project_workflows(project_id, user, token)


@router.post(
    "/{project_id}/workflows",
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_workflow(
    project_id: str,
    data: WorkflowCreate,
    user: User = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    """Create a new workflow in a project."""
    token = credentials.credentials if credentials else None
    wf = await create_project_workflow(project_id, data, user, token)
    if not wf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied.",
        )
    return wf
