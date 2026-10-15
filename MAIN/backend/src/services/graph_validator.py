"""Graph validation service.

Validates the ReactFlow graph before compilation to catch topology errors,
missing configuration, invalid edges, and other problems that would produce
broken LangGraph code.

Returns structured validation results instead of generic error messages.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from src.models.graph import (
    EdgeConfig,
    GraphRequest,
    NodeConfig,
    NodeType,
    ToolName,
)


class Severity(str, Enum):
    ERROR = "error"
    WARNING = "warning"


@dataclass
class ValidationError:
    severity: Severity
    message: str
    node_id: str | None = None
    edge_source: str | None = None
    edge_target: str | None = None


@dataclass
class ValidationResult:
    valid: bool = True
    errors: list[ValidationError] = field(default_factory=list)

    def add_error(self, message: str, **kwargs) -> None:
        self.errors.append(ValidationError(severity=Severity.ERROR, message=message, **kwargs))
        self.valid = False

    def add_warning(self, message: str, **kwargs) -> None:
        self.errors.append(ValidationError(severity=Severity.WARNING, message=message, **kwargs))


# Tools that have actual backend implementations.
SUPPORTED_TOOLS: set[ToolName] = {ToolName.TAVILY_SEARCH, ToolName.WIKIPEDIA}

# Tools that exist in the enum but have no real implementation.
UNSUPPORTED_TOOLS: set[ToolName] = {ToolName.CALCULATOR, ToolName.PYTHON_REPL}


def validate_graph(request: GraphRequest) -> ValidationResult:
    """Run all validation checks on the graph and return structured results."""
    result = ValidationResult()

    nodes = request.nodes
    edges = request.edges

    if not nodes:
        result.add_error("Workflow has no nodes. Add at least one agent node.")
        return result

    node_map: dict[str, NodeConfig] = {n.id: n for n in nodes}
    node_ids: set[str] = set(node_map.keys())

    # Build adjacency info
    node_out_edges: dict[str, list[str]] = {}
    node_in_edges: dict[str, list[str]] = {}
    for edge in edges:
        node_out_edges.setdefault(edge.source, []).append(edge.target)
        node_in_edges.setdefault(edge.target, []).append(edge.source)

    _validate_edges(result, edges, node_ids)
    _validate_node_configs(result, nodes, node_map)
    _validate_router_targets(result, nodes, node_ids)
    _validate_tool_connections(result, nodes, edges, node_map)
    _validate_entry_point(result, nodes, edges, node_in_edges, node_map)
    _validate_connectivity(result, nodes, edges, node_map)

    return result


def _validate_edges(
    result: ValidationResult,
    edges: list[EdgeConfig],
    node_ids: set[str],
) -> None:
    """Check for dangling edges, self-loops, and duplicates."""
    seen_edges: set[tuple[str, str]] = set()

    for edge in edges:
        src = edge.source
        tgt = edge.target

        # Allow START as a virtual source
        if src != "START" and src not in node_ids:
            result.add_error(
                f'Edge source "{src}" does not exist as a node.',
                edge_source=src,
                edge_target=tgt,
            )

        # Allow END as a virtual target
        if tgt != "END" and tgt not in node_ids:
            result.add_error(
                f'Edge target "{tgt}" does not exist as a node.',
                edge_source=src,
                edge_target=tgt,
            )

        # Self-loop
        if src == tgt:
            result.add_error(
                f'Node "{src}" has a self-loop edge.',
                node_id=src,
            )

        # Duplicate edge
        edge_key = (src, tgt)
        if edge_key in seen_edges:
            result.add_warning(
                f'Duplicate edge from "{src}" to "{tgt}".',
                edge_source=src,
                edge_target=tgt,
            )
        seen_edges.add(edge_key)


def _validate_node_configs(
    result: ValidationResult,
    nodes: list[NodeConfig],
    node_map: dict[str, NodeConfig],
) -> None:
    """Validate that each node has required configuration."""
    for node in nodes:
        if not node.label or not node.label.strip():
            result.add_error(
                f'Node "{node.id}" has no label.',
                node_id=node.id,
            )

        if node.type == NodeType.LLM_AGENT:
            if not node.provider:
                result.add_error(
                    f'Agent "{node.label}" has no provider selected.',
                    node_id=node.id,
                )
            if not node.model:
                result.add_warning(
                    f'Agent "{node.label}" has no model specified. Will use provider default.',
                    node_id=node.id,
                )

        elif node.type == NodeType.TOOL:
            if not node.tool_name:
                result.add_error(
                    f'Tool "{node.label}" has no tool type selected.',
                    node_id=node.id,
                )
            elif node.tool_name in UNSUPPORTED_TOOLS:
                result.add_error(
                    f'Tool "{node.label}" uses "{node.tool_name.value}" which is not yet implemented. '
                    f'Supported tools: {", ".join(t.value for t in SUPPORTED_TOOLS)}.',
                    node_id=node.id,
                )

        elif node.type == NodeType.ROUTER:
            if not node.conditions or len(node.conditions) == 0:
                result.add_error(
                    f'Router "{node.label}" has no conditions defined.',
                    node_id=node.id,
                )
            else:
                for i, cond in enumerate(node.conditions):
                    if not cond.keyword or not cond.keyword.strip():
                        result.add_error(
                            f'Router "{node.label}" condition {i + 1} has no keyword.',
                            node_id=node.id,
                        )
                    if not cond.target_node_id or not cond.target_node_id.strip():
                        result.add_error(
                            f'Router "{node.label}" condition {i + 1} has no target.',
                            node_id=node.id,
                        )


def _validate_router_targets(
    result: ValidationResult,
    nodes: list[NodeConfig],
    node_ids: set[str],
) -> None:
    """Verify that router condition targets point to existing nodes (or END)."""
    for node in nodes:
        if node.type != NodeType.ROUTER or not node.conditions:
            continue

        for i, cond in enumerate(node.conditions):
            target = cond.target_node_id
            if not target:
                continue
            if target != "END" and target not in node_ids:
                result.add_error(
                    f'Router "{node.label}" condition {i + 1} points to '
                    f'missing node "{target}".',
                    node_id=node.id,
                )


def _validate_tool_connections(
    result: ValidationResult,
    nodes: list[NodeConfig],
    edges: list[EdgeConfig],
    node_map: dict[str, NodeConfig],
) -> None:
    """Validate that tools are properly connected to agent nodes."""
    tool_ids = {n.id for n in nodes if n.type == NodeType.TOOL}

    for tool_id in tool_ids:
        tool_node = node_map[tool_id]
        # A tool should have at least one agent connecting TO it
        incoming_agents = [
            e.source for e in edges
            if e.target == tool_id
            and e.source in node_map
            and node_map[e.source].type == NodeType.LLM_AGENT
        ]
        if not incoming_agents:
            result.add_warning(
                f'Tool "{tool_node.label}" is not connected from any agent. '
                f'Tools should be connected: Agent → Tool.',
                node_id=tool_id,
            )


def _validate_entry_point(
    result: ValidationResult,
    nodes: list[NodeConfig],
    edges: list[EdgeConfig],
    node_in_edges: dict[str, list[str]],
    node_map: dict[str, NodeConfig],
) -> None:
    """Ensure there is exactly one deterministic entry point."""
    # Check for explicit START edge
    start_targets = [e.target for e in edges if e.source == "START"]

    if len(start_targets) > 1:
        result.add_error(
            "Multiple START connections found. The workflow must have a single entry point."
        )
        return

    if len(start_targets) == 1:
        return  # Explicit start is fine

    # No explicit START — find nodes with no incoming non-tool edges
    # (Incoming edges from tools are ToolNode return edges and do not start workflows)
    entry_candidates = []
    for node in nodes:
        if node.type == NodeType.TOOL:
            continue  # Tools shouldn't be entry points

        incoming_sources = node_in_edges.get(node.id, [])
        non_tool_incoming = [
            src for src in incoming_sources
            if src in node_map and node_map[src].type != NodeType.TOOL
        ]
        if len(non_tool_incoming) == 0:
            entry_candidates.append(node)

    if len(entry_candidates) == 0:
        result.add_error(
            "No valid entry point found. Add a START connection or ensure "
            "at least one agent or router node has no incoming edges."
        )
    elif len(entry_candidates) > 1:
        names = ", ".join(f'"{n.label}"' for n in entry_candidates)
        result.add_error(
            f"Multiple possible entry nodes: {names}. "
            "Please connect the workflow from a single starting node, or add "
            "an explicit START connection."
        )


def _validate_connectivity(
    result: ValidationResult,
    nodes: list[NodeConfig],
    edges: list[EdgeConfig],
    node_map: dict[str, NodeConfig],
) -> None:
    """Warn about completely disconnected nodes."""
    if len(nodes) <= 1:
        return

    connected_ids: set[str] = set()
    for edge in edges:
        if edge.source in node_map:
            connected_ids.add(edge.source)
        if edge.target in node_map:
            connected_ids.add(edge.target)

    for node in nodes:
        if node.id not in connected_ids:
            result.add_warning(
                f'Node "{node.label}" is disconnected from the rest of the workflow.',
                node_id=node.id,
            )
