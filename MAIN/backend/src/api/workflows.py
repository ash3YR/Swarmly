"""API router for managing individual workflows."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials

from src.api.auth import get_current_user, security
from src.models.workspace import User, WorkflowResponse, WorkflowUpdate
from src.services.workspace_db import (
    delete_user_workflow,
    get_user_workflow,
    update_user_workflow,
)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    user: User = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    """Retrieve a single workflow document ensuring user ownership."""
    token = credentials.credentials if credentials else None
    wf = await get_user_workflow(workflow_id, user, token)
    if not wf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found or access denied.",
        )
    return wf


@router.put("/{workflow_id}", response_model=WorkflowResponse)
@router.patch("/{workflow_id}", response_model=WorkflowResponse)
async def save_workflow(
    workflow_id: str,
    data: WorkflowUpdate,
    user: User = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    """Save/update workflow name and graph_json document."""
    token = credentials.credentials if credentials else None
    wf = await update_user_workflow(workflow_id, data, user, token)
    if not wf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found or access denied.",
        )
    return wf


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: str,
    user: User = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
):
    """Delete a workflow document ensuring user ownership."""
    token = credentials.credentials if credentials else None
    success = await delete_user_workflow(workflow_id, user, token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found or access denied.",
        )
    return None
