"""API endpoints for generating LangGraph code."""

from fastapi import APIRouter, HTTPException

from src.models.graph import (
    GenerateResponse,
    GraphRequest,
    ValidationErrorItem,
    ValidationResponse,
)
from src.services.code_generator import generate_langgraph_code
from src.services.graph_validator import validate_graph, Severity

router = APIRouter(prefix="/api", tags=["generate"])


@router.post("/generate")
async def generate_code(request: GraphRequest) -> GenerateResponse | ValidationResponse:
    """Generate LangGraph Python code from a visual graph definition.

    Runs validation first. If there are errors (not just warnings),
    returns a ValidationResponse with HTTP 422. Otherwise generates code.
    """
    # Validate the graph
    validation = validate_graph(request)

    # Separate errors from warnings
    errors = [e for e in validation.errors if e.severity == Severity.ERROR]
    warnings = [e for e in validation.errors if e.severity == Severity.WARNING]

    if errors:
        # Return validation errors without generating code
        raise HTTPException(
            status_code=422,
            detail={
                "valid": False,
                "errors": [
                    {
                        "severity": e.severity.value,
                        "message": e.message,
                        "node_id": e.node_id,
                        "edge_source": e.edge_source,
                        "edge_target": e.edge_target,
                    }
                    for e in errors + warnings
                ],
            },
        )

    # Generate code
    code = generate_langgraph_code(request)

    return GenerateResponse(
        code=code,
        agent_name=request.agent_name,
        node_count=len(request.nodes),
        edge_count=len(request.edges),
        validation_warnings=[
            ValidationErrorItem(
                severity=w.severity.value,
                message=w.message,
                node_id=w.node_id,
                edge_source=w.edge_source,
                edge_target=w.edge_target,
            )
            for w in warnings
        ],
    )


@router.post("/validate", response_model=ValidationResponse)
async def validate_workflow(request: GraphRequest) -> ValidationResponse:
    """Validate a graph without generating code.

    Useful for real-time validation as the user builds their workflow.
    """
    validation = validate_graph(request)

    return ValidationResponse(
        valid=validation.valid,
        errors=[
            ValidationErrorItem(
                severity=e.severity.value,
                message=e.message,
                node_id=e.node_id,
                edge_source=e.edge_source,
                edge_target=e.edge_target,
            )
            for e in validation.errors
        ],
    )
