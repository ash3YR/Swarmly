"""Test that the 3 starter templates from the frontend compile cleanly."""

from src.models.graph import GraphRequest, NodeConfig, EdgeConfig, RouterCondition
from src.services.graph_validator import validate_graph
from src.services.code_generator import generate_langgraph_code
import ast


def test_starter_template_research_agent():
    request = GraphRequest(
        agent_name="Research Agent",
        nodes=[
            NodeConfig(
                id="agent_researcher",
                type="llm_agent",
                label="Research Agent",
                provider="openai",
                model="gpt-4o",
                temperature=0.7,
                system_prompt="You are an expert research analyst.",
            ),
            NodeConfig(
                id="tool_search",
                type="tool",
                label="Web Search",
                tool_name="tavily_search",
            ),
        ],
        edges=[
            EdgeConfig(source="agent_researcher", target="tool_search"),
            EdgeConfig(source="tool_search", target="agent_researcher"),
        ],
    )

    validation = validate_graph(request)
    assert validation.valid is True
    assert len(validation.errors) == 0

    code = generate_langgraph_code(request)
    assert code is not None
    tree = ast.parse(code)
    assert tree is not None
    assert "ToolNode" in code
    assert "tools_condition" in code


def test_starter_template_research_to_writer():
    request = GraphRequest(
        agent_name="Research to Writer",
        nodes=[
            NodeConfig(
                id="agent_researcher",
                type="llm_agent",
                label="Researcher",
                provider="openai",
                model="gpt-4o",
                temperature=0.5,
                system_prompt="Conduct comprehensive research.",
            ),
            NodeConfig(
                id="agent_writer",
                type="llm_agent",
                label="Editorial Writer",
                provider="anthropic",
                model="claude-3-5-sonnet-20241022",
                temperature=0.7,
                system_prompt="Transform raw research findings.",
            ),
        ],
        edges=[
            EdgeConfig(source="agent_researcher", target="agent_writer"),
        ],
    )

    validation = validate_graph(request)
    assert validation.valid is True
    assert len(validation.errors) == 0

    code = generate_langgraph_code(request)
    assert code is not None
    tree = ast.parse(code)
    assert tree is not None
    assert 'graph.add_edge("agent_researcher", "agent_writer")' in code


def test_starter_template_supervisor_workers():
    request = GraphRequest(
        agent_name="Supervisor with Workers",
        nodes=[
            NodeConfig(
                id="agent_supervisor",
                type="llm_agent",
                label="Supervisor",
                provider="openai",
                model="gpt-4o",
                temperature=0.2,
                system_prompt="Route to specialists.",
            ),
            NodeConfig(
                id="router_director",
                type="router",
                label="Task Router",
                conditions=[
                    RouterCondition(keyword="code", target_node_id="worker_coder"),
                    RouterCondition(keyword="research", target_node_id="worker_researcher"),
                ],
            ),
            NodeConfig(
                id="worker_coder",
                type="llm_agent",
                label="Coding Specialist",
                provider="openai",
                model="gpt-4o",
                temperature=0.3,
                system_prompt="Write code.",
            ),
            NodeConfig(
                id="worker_researcher",
                type="llm_agent",
                label="Research Specialist",
                provider="anthropic",
                model="claude-3-5-sonnet-20241022",
                temperature=0.6,
                system_prompt="Provide research.",
            ),
        ],
        edges=[
            EdgeConfig(source="agent_supervisor", target="router_director"),
            EdgeConfig(source="router_director", target="worker_coder", label="code"),
            EdgeConfig(source="router_director", target="worker_researcher", label="research"),
        ],
    )

    validation = validate_graph(request)
    assert validation.valid is True
    assert len(validation.errors) == 0

    code = generate_langgraph_code(request)
    assert code is not None
    tree = ast.parse(code)
    assert tree is not None
    assert "add_conditional_edges" in code
