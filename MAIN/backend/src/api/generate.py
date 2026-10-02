"""API endpoints for generating LangGraph code."""

from fastapi import APIRouter

from src.models.graph import GraphRequest, GenerateResponse
from src.services.code_generator import generate_langgraph_code

router = APIRouter(prefix="/api", tags=["generate"])

@router.post("/generate", response_model=GenerateResponse)
async def generate_code(request: GraphRequest) -> GenerateResponse:
    """Generate LangGraph Python code from a visual graph definition."""
    code = generate_langgraph_code(request)
    return GenerateResponse(
        code=code,
        agent_name=request.agent_name,
        node_count=len(request.nodes),
        edge_count=len(request.edges),
    )
