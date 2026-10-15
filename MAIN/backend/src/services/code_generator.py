"""Service for generating LangGraph code from graph configurations.

Compilation pipeline:
    ReactFlow graph → topology analysis → imports → state schema → tools →
    agent/node functions → router functions → graph assembly → conditional edges →
    execution entrypoint → Python source

Key design decisions:
    - Router nodes are VIRTUAL: they become conditional_edges, never graph.add_node()
    - Tool nodes use the LangGraph ToolNode + tools_condition pattern
    - API keys use os.getenv(), never hardcoded in generated output
    - The START constant is used for entry points (LangGraph ≥0.2)
"""

from __future__ import annotations

import re

from src.models.graph import (
    EdgeConfig,
    GraphRequest,
    LLMProvider,
    NodeConfig,
    NodeType,
    ToolName,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _safe_id(node_id: str) -> str:
    """Convert a ReactFlow node ID into a valid Python identifier."""
    safe = re.sub(r"\W|^(?=\d)", "_", node_id)
    return safe


def _env_var_name(provider: LLMProvider | None, label: str = "") -> str:
    """Return the canonical environment variable name for a provider API key."""
    mapping = {
        LLMProvider.OPENAI: "OPENAI_API_KEY",
        LLMProvider.ANTHROPIC: "ANTHROPIC_API_KEY",
        LLMProvider.GOOGLE: "GOOGLE_API_KEY",
    }
    return mapping.get(provider, "LLM_API_KEY")


# ── Topology Analysis ─────────────────────────────────────────────────────────

def _analyze_topology(
    nodes: list[NodeConfig], edges: list[EdgeConfig]
) -> dict:
    """Pre-compute graph topology for all subsequent generation passes."""
    node_map: dict[str, NodeConfig] = {n.id: n for n in nodes}
    router_ids: set[str] = {n.id for n in nodes if n.type == NodeType.ROUTER}
    tool_ids: set[str] = {n.id for n in nodes if n.type == NodeType.TOOL}
    agent_ids: set[str] = {n.id for n in nodes if n.type == NodeType.LLM_AGENT}

    node_out_edges: dict[str, list[str]] = {}
    node_in_edges: dict[str, list[str]] = {}
    for edge in edges:
        node_out_edges.setdefault(edge.source, []).append(edge.target)
        node_in_edges.setdefault(edge.target, []).append(edge.source)

    # For each agent, find directly connected tool nodes
    agent_to_tools: dict[str, list[NodeConfig]] = {}
    for agent_id in agent_ids:
        tools = []
        for target_id in node_out_edges.get(agent_id, []):
            if target_id in tool_ids and target_id in node_map:
                tools.append(node_map[target_id])
        agent_to_tools[agent_id] = tools

    # For each router, find which agents feed into it and its condition targets
    router_sources: dict[str, list[str]] = {}
    for router_id in router_ids:
        sources = [src for src in node_in_edges.get(router_id, []) if src not in tool_ids]
        if not sources or "START" in node_in_edges.get(router_id, []):
            sources = ["START"]
        router_sources[router_id] = sources

    # Determine entry point
    entry_node_id = _find_entry_point(nodes, edges, node_in_edges, router_ids, tool_ids)

    return {
        "node_map": node_map,
        "router_ids": router_ids,
        "tool_ids": tool_ids,
        "agent_ids": agent_ids,
        "node_out_edges": node_out_edges,
        "node_in_edges": node_in_edges,
        "agent_to_tools": agent_to_tools,
        "router_sources": router_sources,
        "entry_node_id": entry_node_id,
    }


def _find_entry_point(
    nodes: list[NodeConfig],
    edges: list[EdgeConfig],
    node_in_edges: dict[str, list[str]],
    router_ids: set[str],
    tool_ids: set[str],
) -> str | None:
    """Determine the workflow entry node. Returns None if entry is handled via START router."""
    # 1. Explicit START edge
    for edge in edges:
        if edge.source == "START":
            if edge.target in router_ids:
                return None
            return edge.target

    # 2. Find nodes with no incoming non-tool edges
    candidates = []
    for node in nodes:
        if node.id in tool_ids:
            continue
        incoming_sources = node_in_edges.get(node.id, [])
        non_tool_incoming = [src for src in incoming_sources if src not in tool_ids]
        if len(non_tool_incoming) == 0:
            candidates.append(node.id)

    if len(candidates) == 1:
        if candidates[0] in router_ids:
            return None
        return candidates[0]

    # 3. Fallback: first agent node
    for node in nodes:
        if node.type == NodeType.LLM_AGENT:
            return node.id

    return nodes[0].id if nodes else None


# ── Main Generator ─────────────────────────────────────────────────────────────

def generate_langgraph_code(request: GraphRequest) -> str:
    """Generate the complete, runnable LangGraph Python script."""
    nodes = request.nodes
    edges = request.edges

    topo = _analyze_topology(nodes, edges)

    used_providers = {n.provider for n in nodes if n.provider}
    used_tools = {n.tool_name for n in nodes if n.tool_name}
    has_tools = len(topo["agent_to_tools"]) > 0 and any(
        len(tools) > 0 for tools in topo["agent_to_tools"].values()
    )
    has_routers = len(topo["router_ids"]) > 0

    imports_section = _generate_imports(used_providers, used_tools, has_tools, has_routers)
    env_section = _generate_env_setup(used_providers, used_tools)
    state_section = _generate_state_schema()
    tools_section, tool_vars = _generate_tools(nodes)
    nodes_section = _generate_nodes(nodes, topo, tool_vars)
    graph_section = _generate_graph_construction(nodes, edges, topo, tool_vars)
    main_section = _generate_main_block()

    sections = [
        f'"""Generated by Swarmly for Agent: {request.agent_name}"""',
        "# -- Imports --",
        imports_section,
        "# -- Environment --",
        env_section,
        "# -- State Schema --",
        state_section,
    ]

    if tools_section:
        sections.extend(["# -- Tools --", tools_section])

    sections.extend([
        "# -- Nodes --",
        nodes_section,
        "# -- Graph Construction --",
        graph_section,
        "# -- Entry Point --",
        main_section,
    ])

    return "\n\n".join(filter(None, sections))


# ── Pass 1: Imports ────────────────────────────────────────────────────────────

def _generate_imports(
    used_providers: set[LLMProvider],
    used_tools: set[ToolName],
    has_tools: bool,
    has_routers: bool,
) -> str:
    """Generate the imports block."""
    imports = [
        "import os",
        "import operator",
        "from typing import Annotated, TypedDict",
        "",
        "from langgraph.graph import StateGraph, START, END",
        "from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage",
    ]

    if has_tools:
        imports.append("from langgraph.prebuilt import ToolNode, tools_condition")

    # Providers
    if LLMProvider.OPENAI in used_providers:
        imports.append("from langchain_openai import ChatOpenAI")
    if LLMProvider.ANTHROPIC in used_providers:
        imports.append("from langchain_anthropic import ChatAnthropic")
    if LLMProvider.GOOGLE in used_providers:
        imports.append("from langchain_google_genai import ChatGoogleGenerativeAI")
    if LLMProvider.OLLAMA in used_providers:
        imports.append("from langchain_ollama import ChatOllama")

    # Tools
    if ToolName.TAVILY_SEARCH in used_tools:
        imports.append("from langchain_community.tools.tavily_search import TavilySearchResults")
    if ToolName.WIKIPEDIA in used_tools:
        imports.append("from langchain_community.tools.wikipedia import WikipediaQueryRun")
        imports.append("from langchain_community.utilities.wikipedia import WikipediaAPIWrapper")

    return "\n".join(imports)


# ── Pass 1b: Environment variables ─────────────────────────────────────────────

def _generate_env_setup(
    used_providers: set[LLMProvider],
    used_tools: set[ToolName],
) -> str:
    """Generate environment variable loading."""
    lines = [
        "# Set these environment variables before running:",
    ]

    env_vars = set()
    for provider in used_providers:
        if provider == LLMProvider.OLLAMA:
            continue
        env_vars.add(_env_var_name(provider))

    if ToolName.TAVILY_SEARCH in used_tools:
        env_vars.add("TAVILY_API_KEY")

    for var in sorted(env_vars):
        lines.append(f'# export {var}="your-key-here"')

    return "\n".join(lines)


# ── Pass 2: State Schema ──────────────────────────────────────────────────────

def _generate_state_schema() -> str:
    """Generate the AgentState class definition."""
    return (
        "class AgentState(TypedDict):\n"
        "    messages: Annotated[list[BaseMessage], operator.add]"
    )


# ── Pass 3: Tool Instantiation ────────────────────────────────────────────────

def _generate_tools(nodes: list[NodeConfig]) -> tuple[str, dict[str, str]]:
    """Generate tool instantiations and return a mapping of node_id to tool variable."""
    tool_lines: list[str] = []
    tool_vars: dict[str, str] = {}

    for node in nodes:
        if node.type == NodeType.TOOL and node.tool_name:
            var_name = f"tool_{_safe_id(node.id)}"
            tool_vars[node.id] = var_name

            if node.tool_name == ToolName.TAVILY_SEARCH:
                tool_lines.append(
                    f'{var_name} = TavilySearchResults('
                    f'api_key=os.getenv("TAVILY_API_KEY"), max_results=3)'
                )
            elif node.tool_name == ToolName.WIKIPEDIA:
                tool_lines.append(f'{var_name}_api = WikipediaAPIWrapper()')
                tool_lines.append(f'{var_name} = WikipediaQueryRun(api_wrapper={var_name}_api)')
            # Calculator and Python REPL are validated as unsupported before reaching here

    return "\n".join(tool_lines), tool_vars


# ── Pass 4: Node Functions ────────────────────────────────────────────────────

def _generate_nodes(
    nodes: list[NodeConfig],
    topo: dict,
    tool_vars: dict[str, str],
) -> str:
    """Generate node functions for agents and router decision functions."""
    node_blocks: list[str] = []

    for node in nodes:
        safe_id = _safe_id(node.id)

        if node.type == NodeType.LLM_AGENT:
            block = _generate_agent_function(node, safe_id, topo, tool_vars)
            node_blocks.append(block)

        elif node.type == NodeType.ROUTER:
            block = _generate_router_function(node, safe_id, topo)
            node_blocks.append(block)

        # Tool nodes don't need custom functions — they use ToolNode from langgraph.prebuilt

    return "\n\n".join(node_blocks)


def _generate_agent_function(
    node: NodeConfig,
    safe_id: str,
    topo: dict,
    tool_vars: dict[str, str],
) -> str:
    """Generate a single agent node function."""
    # LLM constructor
    model = node.model or "gpt-4o"
    temp = node.temperature if node.temperature is not None else 0.7
    env_var = _env_var_name(node.provider)

    if node.provider == LLMProvider.OPENAI:
        llm_init = f'ChatOpenAI(model="{model}", api_key=os.getenv("{env_var}"), temperature={temp})'
    elif node.provider == LLMProvider.ANTHROPIC:
        llm_init = f'ChatAnthropic(model="{model}", api_key=os.getenv("{env_var}"), temperature={temp})'
    elif node.provider == LLMProvider.GOOGLE:
        llm_init = f'ChatGoogleGenerativeAI(model="{model}", google_api_key=os.getenv("{env_var}"), temperature={temp})'
    elif node.provider == LLMProvider.OLLAMA:
        llm_init = f'ChatOllama(model="{model}", temperature={temp})'
    else:
        llm_init = f'ChatOpenAI(model="{model}", api_key=os.getenv("OPENAI_API_KEY"), temperature={temp})'

    connected_tools = topo["agent_to_tools"].get(node.id, [])
    sys_prompt = node.system_prompt or "You are a helpful assistant."
    # Escape triple quotes in system prompt
    sys_prompt_escaped = sys_prompt.replace('"""', '\\"\\"\\"')

    block = [
        f"def {safe_id}_node(state: AgentState) -> dict:",
        f'    """Node function for agent: {node.label}"""',
        f"    llm = {llm_init}",
    ]

    if connected_tools:
        tools_list = ", ".join(
            tool_vars[t.id] for t in connected_tools if t.id in tool_vars
        )
        if tools_list:
            block.append(f"    llm_with_tools = llm.bind_tools([{tools_list}])")
            block.append(
                f'    response = llm_with_tools.invoke('
                f'[SystemMessage(content="""{sys_prompt_escaped}""")] + state["messages"])'
            )
        else:
            block.append(
                f'    response = llm.invoke('
                f'[SystemMessage(content="""{sys_prompt_escaped}""")] + state["messages"])'
            )
    else:
        block.append(
            f'    response = llm.invoke('
            f'[SystemMessage(content="""{sys_prompt_escaped}""")] + state["messages"])'
        )

    block.append('    return {"messages": [response]}')
    return "\n".join(block)


def _generate_router_function(
    node: NodeConfig,
    safe_id: str,
    topo: dict,
) -> str:
    """Generate a router decision function.

    Router nodes are VIRTUAL — they are not added as graph.add_node().
    They exist only as conditional edge routing functions.
    """
    block = [
        f"def {safe_id}_route(state: AgentState) -> str:",
        f'    """Conditional router: {node.label}"""',
        '    messages = state.get("messages", [])',
        '    if not messages:',
        '        return "END"',
        '    last_content = messages[-1].content if hasattr(messages[-1], "content") else ""',
    ]

    default_target = "END"
    if node.conditions:
        for cond in node.conditions:
            target_key = _router_target_key(cond.target_node_id, topo)
            keyword = cond.keyword.replace('"', '\\"')
            block.append(f'    if "{keyword}" in last_content:')
            block.append(f'        return "{target_key}"')

            if cond.default_target_id:
                default_target = _router_target_key(cond.default_target_id, topo)

    block.append(f'    return "{default_target}"')
    return "\n".join(block)


def _router_target_key(target_node_id: str, topo: dict) -> str:
    """Convert a router target node ID to the key used in the conditional edges mapping."""
    if target_node_id == "END":
        return "END"
    return _safe_id(target_node_id)


# ── Pass 5: Graph Construction ─────────────────────────────────────────────────

def _generate_graph_construction(
    nodes: list[NodeConfig],
    edges: list[EdgeConfig],
    topo: dict,
    tool_vars: dict[str, str],
) -> str:
    """Generate the graph assembly logic."""
    lines = [
        "def build_graph() -> StateGraph:",
        "    graph = StateGraph(AgentState)",
        "",
    ]

    router_ids = topo["router_ids"]
    tool_ids = topo["tool_ids"]
    agent_to_tools = topo["agent_to_tools"]
    node_map = topo["node_map"]
    entry_node_id = topo["entry_node_id"]

    # ── Add nodes (agents only + tool nodes) ──
    lines.append("    # Add nodes")
    for node in nodes:
        safe_id = _safe_id(node.id)

        if node.type == NodeType.LLM_AGENT:
            lines.append(f'    graph.add_node("{safe_id}", {safe_id}_node)')

        elif node.type == NodeType.TOOL:
            t_var = tool_vars.get(node.id)
            if t_var:
                # LangGraph ToolNode wraps the tools list
                lines.append(f'    graph.add_node("{safe_id}", ToolNode([{t_var}]))')

        # Router nodes are NOT added — they are virtual
    lines.append("")

    # ── Entry point using START ──
    if entry_node_id and entry_node_id not in router_ids and entry_node_id != "START":
        entry_safe = _safe_id(entry_node_id)
        lines.append(f'    # Entry point')
        lines.append(f'    graph.add_edge(START, "{entry_safe}")')
        lines.append("")

    # ── Classify and add edges ──
    lines.append("    # Add edges")

    # Track which agent→tool connections we've already handled via tools_condition
    agents_with_tool_edges: set[str] = set()

    for edge in edges:
        if edge.source == "START" or edge.target == "START":
            continue

        src = edge.source
        tgt = edge.target

        # Skip edges TO router nodes — these are handled via conditional edges
        if tgt in router_ids:
            continue

        # Skip edges FROM router nodes — router is virtual, edges come from conditions
        if src in router_ids:
            continue

        # Agent → Tool: use tools_condition pattern
        if src in topo["agent_ids"] and tgt in tool_ids:
            if src not in agents_with_tool_edges:
                agents_with_tool_edges.add(src)
                _add_tool_edges(lines, src, tgt, topo, tool_vars, edges, node_map)
            continue

        # Tool → Agent: already handled in _add_tool_edges
        if src in tool_ids:
            continue

        # Normal edge (Agent → Agent, or Agent → END)
        src_safe = _safe_id(src)
        if tgt == "END":
            lines.append(f'    graph.add_edge("{src_safe}", END)')
        else:
            tgt_safe = _safe_id(tgt)
            lines.append(f'    graph.add_edge("{src_safe}", "{tgt_safe}")')

    lines.append("")

    # ── Conditional edges for routers ──
    if router_ids:
        lines.append("    # Conditional edges (routers)")
        for router_id in router_ids:
            router_node = node_map[router_id]
            safe_id = _safe_id(router_id)

            # Find which nodes feed into this router
            incoming = topo["router_sources"].get(router_id, [])

            # Build the mapping from route keys to node names
            mapping = _build_router_mapping(router_node, topo)

            for inc_id in incoming:
                if inc_id == "START":
                    src_expr = "START"
                else:
                    if inc_id not in node_map:
                        continue
                    src_expr = f'"{_safe_id(inc_id)}"'

                # Build mapping string
                mapping_parts = []
                for key, target in mapping.items():
                    if target == "END":
                        mapping_parts.append(f'"{key}": END')
                    else:
                        mapping_parts.append(f'"{key}": "{target}"')
                mapping_str = ", ".join(mapping_parts)

                lines.append(f'    graph.add_conditional_edges(')
                lines.append(f'        {src_expr},')
                lines.append(f'        {safe_id}_route,')
                lines.append(f'        {{{mapping_str}}}')
                lines.append(f'    )')

        lines.append("")

    lines.append("    return graph.compile()")
    lines.append("")
    lines.append("app = build_graph()")

    return "\n".join(lines)


def _add_tool_edges(
    lines: list[str],
    agent_id: str,
    first_tool_id: str,
    topo: dict,
    tool_vars: dict[str, str],
    edges: list[EdgeConfig],
    node_map: dict[str, NodeConfig],
) -> None:
    """Add the proper LangGraph tool execution pattern for an agent with tools.

    Pattern:
        agent → tools_condition → tool_node (if tool call)
        agent → tools_condition → END or next_node (if no tool call)
        tool_node → agent (return to calling agent after tool execution)
    """
    agent_safe = _safe_id(agent_id)
    agent_tools = topo["agent_to_tools"].get(agent_id, [])

    if not agent_tools:
        return

    # For agents with tools, we use tools_condition to decide whether to route to tool or continue
    # Find where the tool output goes back (usually back to the agent)
    # Also find what the agent routes to when NOT calling a tool

    # Get all tool IDs for this agent
    tool_id_set = {t.id for t in agent_tools}

    # Find non-tool targets from this agent (where to go when no tool call)
    non_tool_targets = [
        e.target for e in edges
        if e.source == agent_id
        and e.target not in tool_id_set
        and e.target not in topo["router_ids"]
    ]

    # If agent has only one tool, use a single ToolNode
    # Use tools_condition to route between tool execution and continuation
    first_tool_safe = _safe_id(first_tool_id)

    # Agent → tools_condition
    lines.append(f'    graph.add_conditional_edges(')
    lines.append(f'        "{agent_safe}",')
    lines.append(f'        tools_condition,')
    lines.append(f'    )')

    # Tool → Agent (return after tool execution)
    lines.append(f'    graph.add_edge("{first_tool_safe}", "{agent_safe}")')


def _build_router_mapping(
    router_node: NodeConfig,
    topo: dict,
) -> dict[str, str]:
    """Build the {route_key: target_node_safe_id} mapping for a router."""
    mapping: dict[str, str] = {}

    if not router_node.conditions:
        mapping["END"] = "END"
        return mapping

    for cond in router_node.conditions:
        if not cond.target_node_id:
            continue
        key = _router_target_key(cond.target_node_id, topo)
        if cond.target_node_id == "END":
            mapping[key] = "END"
        else:
            mapping[key] = _safe_id(cond.target_node_id)

    # Add default mapping
    if router_node.conditions and router_node.conditions[0].default_target_id:
        default_id = router_node.conditions[0].default_target_id
        default_key = _router_target_key(default_id, topo)
        if default_id == "END":
            mapping[default_key] = "END"
        else:
            mapping[default_key] = _safe_id(default_id)
    else:
        # Default to END if no default specified
        if "END" not in mapping:
            mapping["END"] = "END"

    return mapping


# ── Pass 6: Main Block ────────────────────────────────────────────────────────

def _generate_main_block() -> str:
    """Generate the execution entry point block."""
    return (
        'if __name__ == "__main__":\n'
        '    result = app.invoke({"messages": [HumanMessage(content="Hello! What can you help me with?")]})\n'
        '    for message in result["messages"]:\n'
        '        print(f"{type(message).__name__}: {message.content}")'
    )
