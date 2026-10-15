"""Models for workspace, projects, and workflows."""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class User(BaseModel):
    """Authenticated user extracted from verified Supabase JWT."""
    id: str
    email: Optional[str] = None
    role: Optional[str] = None


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ProjectUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    created_at: str
    updated_at: str
    workflow_count: Optional[int] = 0


class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    graph_json: Optional[dict[str, Any]] = None


class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    graph_json: Optional[dict[str, Any]] = None


class WorkflowResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    name: str
    graph_json: dict[str, Any]
    created_at: str
    updated_at: str
