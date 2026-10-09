"""Comprehensive tests for the Swarmly compiler.

Tests cover:
    1. Single agent → valid Python
    2. Agent A → Agent B → valid edge
    3. Agent → Tool → Agent → proper ToolNode/tools_condition pattern
    4. Agent → Router → Agent A / Agent B → conditional routing (no graph.add_edge to router)
    5. Agent → Router → Agent / END → valid END route
    6. Full pipeline: Agent → Tool → Agent → Router → Agent
    7. Missing target node → validation error
    8. Missing agent config → validation error
    9. Invalid router target → validation error
   10. Multiple entry nodes → validation error
   11. Syntax validation of generated Python
   12. API keys are never hardcoded in generated code
   13. Unsupported tools → validation error
   14. Router with no conditions → validation error
   15. Disconnected node → validation warning
"""

import ast
import sys

import pytest

sys.path.insert(0, ".")

from src.models.graph import (
    EdgeConfig,
    GraphRequest,
    LLMProvider,
    NodeConfig,
    NodeType,
    RouterCondition,
    ToolName,
)
from src.services.code_generator import generate_langgraph_code
from src.services.graph_validator import Severity, validate_graph


# ── Helpers ─────────────────────────────────────────────────────────────────


def _agent(id: str, label: str = "", **kwargs) -> NodeConfig:
    return NodeConfig(
        id=id,
        type=NodeType.LLM_AGENT,
        label=label or id,
        provider=kwargs.get("provider", LLMProvider.OPENAI),
        model=kwargs.get("model", "gpt-4o"),
        system_prompt=kwargs.get("system_prompt", "You are helpful."),
        temperature=kwargs.get("temperature", 0.7),
    )


def _tool(id: str, tool_name: ToolName = ToolName.TAVILY_SEARCH, label: str = "") -> NodeConfig:
    return NodeConfig(
        id=id,
        type=NodeType.TOOL,
        label=label or id,
        tool_name=tool_name,
    )


def _router(id: str, conditions: list[RouterCondition] | None = None, label: str = "") -> NodeConfig:
    return NodeConfig(
        id=id,
        type=NodeType.ROUTER,
        label=label or id,
        conditions=conditions or [],
    )


def _edge(src: str, tgt: str) -> EdgeConfig:
    return EdgeConfig(source=src, target=tgt)


def _request(
    nodes: list[NodeConfig],
    edges: list[EdgeConfig] | None = None,
    name: str = "TestAgent",
) -> GraphRequest:
    return GraphRequest(agent_name=name, nodes=nodes, edges=edges or [])


def _is_valid_python(code: str) -> bool:
    """Check that generated code is syntactically valid Python."""
    try:
        ast.parse(code)
        return True
    except SyntaxError:
        return False


def _has_no_hardcoded_keys(code: str) -> bool:
    """Ensure no raw API keys appear in code (look for sk- or tvly- patterns)."""
    import re
    # Check that api_key parameters don't have literal string values
    # They should use os.getenv(...)
    matches = re.findall(r'api_key\s*=\s*"[^"]*"', code)
    for match in matches:
        if 'os.getenv(' not in match:
            return False
    return True


# ═══════════════════════════════════════════════════════════════════════════
# TEST 1: Single Agent
# ═══════════════════════════════════════════════════════════════════════════


class TestSingleAgent:
    """A single agent node should produce valid Python."""

    def test_generates_valid_python(self):
        req = _request([_agent("agent_1", "Researcher")])
        code = generate_langgraph_code(req)
        assert _is_valid_python(code), f"Invalid Python:\n{code}"

    def test_contains_agent_function(self):
        req = _request([_agent("agent_1", "Researcher")])
        code = generate_langgraph_code(req)
        assert "def agent_1_node(state: AgentState)" in code

    def test_contains_graph_add_node(self):
        req = _request([_agent("agent_1", "Researcher")])
        code = generate_langgraph_code(req)
        assert 'graph.add_node("agent_1"' in code

    def test_has_entry_point(self):
        req = _request([_agent("agent_1", "Researcher")])
        code = generate_langgraph_code(req)
        assert 'graph.add_edge(START, "agent_1")' in code

    def test_uses_env_var(self):
        req = _request([_agent("agent_1", "Researcher")])
        code = generate_langgraph_code(req)
        assert 'os.getenv("OPENAI_API_KEY")' in code
        assert _has_no_hardcoded_keys(code)

    def test_validation_passes(self):
        req = _request([_agent("agent_1", "Researcher")])
        result = validate_graph(req)
        assert result.valid


# ═══════════════════════════════════════════════════════════════════════════
# TEST 2: Agent → Agent
# ═══════════════════════════════════════════════════════════════════════════


class TestAgentToAgent:
    """Two agents with a direct edge should produce valid code with graph.add_edge."""

    def test_generates_valid_python(self):
        req = _request(
            [_agent("a1", "Researcher"), _agent("a2", "Writer")],
            [_edge("a1", "a2")],
        )
        code = generate_langgraph_code(req)
        assert _is_valid_python(code), f"Invalid Python:\n{code}"

    def test_contains_normal_edge(self):
        req = _request(
            [_agent("a1", "Researcher"), _agent("a2", "Writer")],
            [_edge("a1", "a2")],
        )
        code = generate_langgraph_code(req)
        assert 'graph.add_edge("a1", "a2")' in code

    def test_both_nodes_registered(self):
        req = _request(
            [_agent("a1", "Researcher"), _agent("a2", "Writer")],
            [_edge("a1", "a2")],
        )
        code = generate_langgraph_code(req)
        assert 'graph.add_node("a1"' in code
        assert 'graph.add_node("a2"' in code


# ═══════════════════════════════════════════════════════════════════════════
# TEST 3: Agent → Tool → Agent
# ═══════════════════════════════════════════════════════════════════════════


class TestAgentToolAgent:
    """Agent with tool should use ToolNode + tools_condition pattern."""

    def test_generates_valid_python(self):
        req = _request(
            [
                _agent("a1", "Researcher"),
                _tool("t1", ToolName.TAVILY_SEARCH, "Search"),
            ],
            [_edge("a1", "t1")],
        )
        code = generate_langgraph_code(req)
        assert _is_valid_python(code), f"Invalid Python:\n{code}"

    def test_uses_tools_condition(self):
        req = _request(
            [
                _agent("a1", "Researcher"),
                _tool("t1", ToolName.TAVILY_SEARCH, "Search"),
            ],
            [_edge("a1", "t1")],
        )
        code = generate_langgraph_code(req)
        assert "tools_condition" in code

    def test_tool_routes_back_to_agent(self):
        req = _request(
            [
                _agent("a1", "Researcher"),
                _tool("t1", ToolName.TAVILY_SEARCH, "Search"),
            ],
            [_edge("a1", "t1")],
        )
        code = generate_langgraph_code(req)
        assert 'graph.add_edge("t1", "a1")' in code

    def test_no_direct_agent_tool_edge(self):
        """Agent→Tool should NOT produce graph.add_edge("a1", "t1")."""
        req = _request(
            [
                _agent("a1", "Researcher"),
                _tool("t1", ToolName.TAVILY_SEARCH, "Search"),
            ],
            [_edge("a1", "t1")],
        )
        code = generate_langgraph_code(req)
        # Should not have a direct add_edge from agent to tool
        assert 'graph.add_edge("a1", "t1")' not in code

    def test_agent_binds_tools(self):
        req = _request(
            [
                _agent("a1", "Researcher"),
                _tool("t1", ToolName.TAVILY_SEARCH, "Search"),
            ],
            [_edge("a1", "t1")],
        )
        code = generate_langgraph_code(req)
        assert "bind_tools" in code

    def test_tool_node_registered(self):
        req = _request(
            [
                _agent("a1", "Researcher"),
                _tool("t1", ToolName.TAVILY_SEARCH, "Search"),
            ],
            [_edge("a1", "t1")],
        )
        code = generate_langgraph_code(req)
        assert 'graph.add_node("t1", ToolNode(' in code

    def test_uses_env_for_tavily(self):
        req = _request(
            [
                _agent("a1", "Researcher"),
                _tool("t1", ToolName.TAVILY_SEARCH, "Search"),
            ],
            [_edge("a1", "t1")],
        )
        code = generate_langgraph_code(req)
        assert 'os.getenv("TAVILY_API_KEY")' in code


# ═══════════════════════════════════════════════════════════════════════════
# TEST 4: Agent → Router → Agent A / Agent B (Conditional Routing)
# ═══════════════════════════════════════════════════════════════════════════


class TestAgentRouterBranch:
    """Router should produce conditional_edges, NOT graph.add_edge to router."""

    def setup_method(self):
        self.req = _request(
            [
                _agent("a1", "Supervisor"),
                _router(
                    "r1",
                    [
                        RouterCondition(keyword="research", target_node_id="a2"),
                        RouterCondition(keyword="write", target_node_id="a3"),
                    ],
                    "Router",
                ),
                _agent("a2", "Researcher"),
                _agent("a3", "Writer"),
            ],
            [_edge("a1", "r1")],
        )

    def test_generates_valid_python(self):
        code = generate_langgraph_code(self.req)
        assert _is_valid_python(code), f"Invalid Python:\n{code}"

    def test_no_add_node_for_router(self):
        """Router must NOT be registered as a LangGraph node."""
        code = generate_langgraph_code(self.req)
        assert 'graph.add_node("r1"' not in code

    def test_no_add_edge_to_router(self):
        """Agent→Router must NOT produce graph.add_edge("a1", "r1")."""
        code = generate_langgraph_code(self.req)
        assert 'graph.add_edge("a1", "r1")' not in code

    def test_has_conditional_edges(self):
        code = generate_langgraph_code(self.req)
        assert "graph.add_conditional_edges(" in code

    def test_conditional_edges_on_agent(self):
        """Conditional edges should be on the agent feeding the router, not on the router."""
        code = generate_langgraph_code(self.req)
        assert '"a1"' in code  # source of conditional edge

    def test_router_function_exists(self):
        code = generate_langgraph_code(self.req)
        assert "def r1_route(state: AgentState)" in code

    def test_router_returns_correct_keys(self):
        code = generate_langgraph_code(self.req)
        assert '"a2"' in code
        assert '"a3"' in code


# ═══════════════════════════════════════════════════════════════════════════
# TEST 5: Agent → Router → Agent / END
# ═══════════════════════════════════════════════════════════════════════════


class TestRouterWithEND:
    """Router routing to END should produce valid conditional END edge."""

    def setup_method(self):
        self.req = _request(
            [
                _agent("a1", "Worker"),
                _router(
                    "r1",
                    [
                        RouterCondition(keyword="done", target_node_id="END"),
                        RouterCondition(keyword="continue", target_node_id="a1"),
                    ],
                    "Checker",
                ),
            ],
            [_edge("a1", "r1")],
        )

    def test_generates_valid_python(self):
        code = generate_langgraph_code(self.req)
        assert _is_valid_python(code), f"Invalid Python:\n{code}"

    def test_end_in_mapping(self):
        code = generate_langgraph_code(self.req)
        assert "END" in code

    def test_no_add_edge_to_router(self):
        code = generate_langgraph_code(self.req)
        assert 'graph.add_edge("a1", "r1")' not in code


# ═══════════════════════════════════════════════════════════════════════════
# TEST 6: Full Pipeline — Agent → Tool → Agent → Router → Agent
# ═══════════════════════════════════════════════════════════════════════════


class TestFullPipeline:
    """The entire chain should compile into valid Python."""

    def setup_method(self):
        self.req = _request(
            [
                _agent("a1", "Researcher"),
                _tool("t1", ToolName.TAVILY_SEARCH, "Search"),
                _agent("a2", "Supervisor"),
                _router(
                    "r1",
                    [
                        RouterCondition(keyword="research", target_node_id="a1"),
                        RouterCondition(keyword="done", target_node_id="END"),
                    ],
                    "Decision",
                ),
            ],
            [
                _edge("a1", "t1"),
                _edge("a1", "a2"),
                _edge("a2", "r1"),
            ],
        )

    def test_generates_valid_python(self):
        code = generate_langgraph_code(self.req)
        assert _is_valid_python(code), f"Invalid Python:\n{code}"

    def test_has_all_components(self):
        code = generate_langgraph_code(self.req)
        assert "def a1_node(" in code
        assert "def a2_node(" in code
        assert "def r1_route(" in code
        assert "tools_condition" in code
        assert "graph.add_conditional_edges(" in code
        assert 'graph.add_node("a1"' in code
        assert 'graph.add_node("a2"' in code
        assert 'graph.add_node("t1"' in code
        assert 'graph.add_node("r1"' not in code


# ═══════════════════════════════════════════════════════════════════════════
# TEST 7: Missing Target Node → Validation Error
# ═══════════════════════════════════════════════════════════════════════════


class TestMissingTargetNode:
    """An edge pointing to a non-existent node should fail validation."""

    def test_validation_fails(self):
        req = _request(
            [_agent("a1", "Agent")],
            [_edge("a1", "nonexistent")],
        )
        result = validate_graph(req)
        assert not result.valid
        error_msgs = [e.message for e in result.errors if e.severity == Severity.ERROR]
        assert any("nonexistent" in m for m in error_msgs)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 8: Missing Agent Configuration → Validation Error
# ═══════════════════════════════════════════════════════════════════════════


class TestMissingAgentConfig:
    """Agent without provider should fail validation."""

    def test_validation_fails_no_provider(self):
        node = NodeConfig(
            id="a1",
            type=NodeType.LLM_AGENT,
            label="Agent",
            provider=None,
            model=None,
        )
        req = _request([node])
        result = validate_graph(req)
        assert not result.valid
        error_msgs = [e.message for e in result.errors if e.severity == Severity.ERROR]
        assert any("provider" in m.lower() for m in error_msgs)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 9: Invalid Router Target → Validation Error
# ═══════════════════════════════════════════════════════════════════════════


class TestInvalidRouterTarget:
    """Router condition targeting a non-existent node should fail validation."""

    def test_validation_fails(self):
        req = _request(
            [
                _agent("a1", "Agent"),
                _router(
                    "r1",
                    [RouterCondition(keyword="go", target_node_id="nonexistent")],
                    "Router",
                ),
            ],
            [_edge("a1", "r1")],
        )
        result = validate_graph(req)
        assert not result.valid
        error_msgs = [e.message for e in result.errors if e.severity == Severity.ERROR]
        assert any("nonexistent" in m for m in error_msgs)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 10: Multiple Entry Nodes → Validation Error
# ═══════════════════════════════════════════════════════════════════════════


class TestMultipleEntryNodes:
    """Two agents with no incoming edges and no START edge → ambiguous entry."""

    def test_validation_fails(self):
        req = _request(
            [_agent("a1", "Agent 1"), _agent("a2", "Agent 2")],
            [],  # No edges at all
        )
        result = validate_graph(req)
        assert not result.valid
        error_msgs = [e.message for e in result.errors if e.severity == Severity.ERROR]
        assert any("multiple" in m.lower() or "entry" in m.lower() for m in error_msgs)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 11: Generated Code Syntax Validation
# ═══════════════════════════════════════════════════════════════════════════


class TestSyntaxValidation:
    """All generated code across various topologies must be valid Python."""

    @pytest.mark.parametrize(
        "desc,nodes,edges",
        [
            (
                "single_agent",
                [_agent("a1", "A")],
                [],
            ),
            (
                "two_agents",
                [_agent("a1", "A"), _agent("a2", "B")],
                [_edge("a1", "a2")],
            ),
            (
                "agent_with_tool",
                [_agent("a1", "A"), _tool("t1")],
                [_edge("a1", "t1")],
            ),
            (
                "agent_with_router",
                [
                    _agent("a1", "A"),
                    _router("r1", [RouterCondition(keyword="go", target_node_id="a1")]),
                ],
                [_edge("a1", "r1")],
            ),
            (
                "anthropic_provider",
                [_agent("a1", "A", provider=LLMProvider.ANTHROPIC, model="claude-3-5-sonnet-20241022")],
                [],
            ),
            (
                "google_provider",
                [_agent("a1", "A", provider=LLMProvider.GOOGLE, model="gemini-1.5-pro")],
                [],
            ),
            (
                "ollama_provider",
                [_agent("a1", "A", provider=LLMProvider.OLLAMA, model="llama3.2")],
                [],
            ),
            (
                "wikipedia_tool",
                [_agent("a1", "A"), _tool("t1", ToolName.WIKIPEDIA)],
                [_edge("a1", "t1")],
            ),
        ],
    )
    def test_all_valid_python(self, desc, nodes, edges):
        req = _request(nodes, edges)
        code = generate_langgraph_code(req)
        assert _is_valid_python(code), f"[{desc}] Invalid Python:\n{code}"


# ═══════════════════════════════════════════════════════════════════════════
# TEST 12: API Keys Never Hardcoded
# ═══════════════════════════════════════════════════════════════════════════


class TestNoHardcodedKeys:
    """Generated code must use os.getenv() for API keys, never literal strings."""

    def test_openai_uses_env(self):
        req = _request([_agent("a1", "A")])
        code = generate_langgraph_code(req)
        assert 'os.getenv(' in code
        assert 'api_key="sk-' not in code

    def test_tool_uses_env(self):
        req = _request(
            [_agent("a1", "A"), _tool("t1", ToolName.TAVILY_SEARCH)],
            [_edge("a1", "t1")],
        )
        code = generate_langgraph_code(req)
        assert 'os.getenv("TAVILY_API_KEY")' in code
        assert 'api_key="tvly-' not in code


# ═══════════════════════════════════════════════════════════════════════════
# TEST 13: Unsupported Tools → Validation Error
# ═══════════════════════════════════════════════════════════════════════════


class TestUnsupportedTools:
    """Calculator and Python REPL should fail validation."""

    def test_calculator_rejected(self):
        req = _request(
            [_agent("a1", "A"), _tool("t1", ToolName.CALCULATOR, "Calc")],
            [_edge("a1", "t1")],
        )
        result = validate_graph(req)
        assert not result.valid
        error_msgs = [e.message for e in result.errors if e.severity == Severity.ERROR]
        assert any("not yet implemented" in m for m in error_msgs)

    def test_python_repl_rejected(self):
        req = _request(
            [_agent("a1", "A"), _tool("t1", ToolName.PYTHON_REPL, "REPL")],
            [_edge("a1", "t1")],
        )
        result = validate_graph(req)
        assert not result.valid


# ═══════════════════════════════════════════════════════════════════════════
# TEST 14: Router with No Conditions → Validation Error
# ═══════════════════════════════════════════════════════════════════════════


class TestRouterNoConditions:
    """Router with empty conditions should fail validation."""

    def test_validation_fails(self):
        req = _request(
            [_agent("a1", "A"), _router("r1", [], "Router")],
            [_edge("a1", "r1")],
        )
        result = validate_graph(req)
        assert not result.valid
        error_msgs = [e.message for e in result.errors if e.severity == Severity.ERROR]
        assert any("no conditions" in m.lower() for m in error_msgs)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 15: Disconnected Node → Warning
# ═══════════════════════════════════════════════════════════════════════════


class TestDisconnectedNode:
    """A node with no edges should produce a warning (not error)."""

    def test_warning_for_disconnected(self):
        req = _request(
            [_agent("a1", "Connected"), _agent("a2", "Floating")],
            [_edge("START", "a1")],  # Only a1 is connected
        )
        result = validate_graph(req)
        warnings = [e for e in result.errors if e.severity == Severity.WARNING]
        assert any("disconnected" in w.message.lower() or "a2" in (w.node_id or "") for w in warnings)


# ═══════════════════════════════════════════════════════════════════════════
# TEST: Self-loop → Validation Error
# ═══════════════════════════════════════════════════════════════════════════


class TestSelfLoop:
    """A self-loop edge should fail validation."""

    def test_validation_fails(self):
        req = _request(
            [_agent("a1", "Agent")],
            [_edge("a1", "a1")],
        )
        result = validate_graph(req)
        assert not result.valid
        error_msgs = [e.message for e in result.errors if e.severity == Severity.ERROR]
        assert any("self-loop" in m.lower() for m in error_msgs)


# ═══════════════════════════════════════════════════════════════════════════
# TEST: Duplicate Edges → Warning
# ═══════════════════════════════════════════════════════════════════════════


class TestDuplicateEdges:
    """Duplicate edges should produce a warning."""

    def test_warning_for_duplicate(self):
        req = _request(
            [_agent("a1", "A"), _agent("a2", "B")],
            [_edge("a1", "a2"), _edge("a1", "a2")],
        )
        result = validate_graph(req)
        warnings = [e for e in result.errors if e.severity == Severity.WARNING]
        assert any("duplicate" in w.message.lower() for w in warnings)


# ═══════════════════════════════════════════════════════════════════════════
# TEST: START constant used in generated code
# ═══════════════════════════════════════════════════════════════════════════


class TestSTARTConstant:
    """Generated code should use the START constant, not set_entry_point."""

    def test_uses_start_constant(self):
        req = _request([_agent("a1", "Agent")])
        code = generate_langgraph_code(req)
        assert "from langgraph.graph import StateGraph, START, END" in code
        assert "graph.add_edge(START" in code
        assert "set_entry_point" not in code


# ═══════════════════════════════════════════════════════════════════════════
# TEST: Router-First Workflow Topology
# ═══════════════════════════════════════════════════════════════════════════


class TestRouterFirstWorkflow:
    """A workflow starting with a Router node should validate and emit START conditional edges."""

    def test_router_first_entry_point(self):
        nodes = [
            _router(
                "r1",
                conditions=[
                    RouterCondition(keyword="code", target_node_id="w1"),
                    RouterCondition(keyword="research", target_node_id="w2"),
                ],
                label="Director",
            ),
            _agent("w1", "Worker Code"),
            _agent("w2", "Worker Research"),
        ]
        edges = [
            _edge("r1", "w1"),
            _edge("r1", "w2"),
        ]
        req = _request(nodes, edges)

        # 1. Validation must succeed without 'No valid entry point' error
        val = validate_graph(req)
        assert val.valid is True, f"Validation errors: {[e.message for e in val.errors]}"

        # 2. Code generation must produce valid LangGraph Python
        code = generate_langgraph_code(req)
        assert _is_valid_python(code), f"Invalid Python:\n{code}"

        # 3. Router should be wired conditionally from START
        assert "graph.add_conditional_edges(\n        START,\n        r1_route," in code
        # 4. Should not attempt to add direct edge START -> r1 since router is virtual
        assert 'graph.add_edge(START, "r1")' not in code


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

