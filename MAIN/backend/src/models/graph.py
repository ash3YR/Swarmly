"""Pydantic models for the graph definitions."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class NodeType(str, Enum):
    """Types of nodes supported in the graph."""
    LLM_AGENT = "llm_agent"
    TOOL = "tool"
    ROUTER = "router"


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OLLAMA = "ollama"


class ToolName(str, Enum):
    """Supported tools."""
    TAVILY_SEARCH = "tavily_search"
    WIKIPEDIA = "wikipedia"
    CALCULATOR = "calculator"
    PYTHON_REPL = "python_repl"


class RouterCondition(BaseModel):
    """Condition for routing nodes."""
    keyword: str
    target_node_id: str
    default_target_id: Optional[str] = None


class NodeConfig(BaseModel):
    """Configuration for a node in the graph."""
    id: str
    type: NodeType
    label: str
    
    # LLM fields
    provider: Optional[LLMProvider] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.7
    
    # Tool fields
    tool_name: Optional[ToolName] = None
    tool_api_key: Optional[str] = None
    
    # Router fields
    conditions: Optional[list[RouterCondition]] = None


class EdgeConfig(BaseModel):
    """Configuration for an edge in the graph."""
    source: str
    target: str
    label: Optional[str] = None


class GraphRequest(BaseModel):
    """Request payload for graph generation."""
    agent_name: str = "MyAgent"
    nodes: list[NodeConfig] = []
    edges: list[EdgeConfig] = []


class GenerateResponse(BaseModel):
    """Response payload for graph generation."""
    code: str
    agent_name: str
    node_count: int
    edge_count: int
