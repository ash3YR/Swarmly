# Swarmly — Backend Architecture & Design Decisions

> **What this document covers**: The reasoning behind every major technical decision in the backend.

## 1. Why FastAPI?

- Async-native: essential for future SSE/WebSocket streaming of LLM output
- Built-in Pydantic v2 validation + auto Swagger UI at `/docs`
- Python is the right runtime — LangGraph/LangChain are Python-first; a Node.js backend would add a subprocess/RPC layer with no benefit
- uvicorn + asyncio gives the concurrency model needed for parallel agent executions

## 2. Why No Database (Phase 1)?

The backend is a **pure function**: `graph_json ? python_code_string`. Nothing to persist.
- Frontend (Zustand) owns all graph state
- Adding a DB now would be premature (schema, migrations, ORM setup with zero payoff)
- Add in Phase 2 when users need to save and reload agents

## 3. Code Generator — Core Design

Three approaches were evaluated:

| Approach | Verdict |
|---|---|
| Generate code string (chosen) | User can read, copy, run locally |
| Dynamically exec() the code | Security nightmare — needs sandboxing |
| Build LangGraph objects in memory | Cannot show user the code |

The user explicitly wants to *see the code*. A clean, well-commented Python file is the highest-value Phase 1 output.

### Five-Pass Generation Strategy

1. **Import collection**: Walk all nodes, build deduplicated import set
2. **State schema**: Always emit `AgentState(TypedDict)` with `messages: Annotated[list[BaseMessage], operator.add]`
3. **Tool instantiation**: Emit tool objects before node functions that use them
4. **Node functions**: One function per node, in dependency order
5. **Graph construction**: `StateGraph` ? `add_node` ? `set_entry_point` ? `add_edge` / `add_conditional_edges` ? `compile()`

### Why `operator.add` for messages?

```python
messages: Annotated[list[BaseMessage], operator.add]
```

This is the canonical LangGraph pattern. The `Annotated` reducer tells LangGraph how to merge state from parallel branches — `operator.add` means *append*, not *replace*. Without it, concurrent node updates overwrite each other.

### Router Nodes and Conditional Edges

Routers inspect state and return a string key. The generator maps UI conditions `{keyword, targetNodeId}` to:

```python
def router_1_router(state: AgentState) -> str:
    last = state["messages"][-1].content if state["messages"] else ""
    if "DONE" in last: return "end"
    return "search"  # default

graph.add_conditional_edges("router_1", router_1_router, {"search": "tool_1", "end": END})
```

Phase 1: keyword matching. Phase 2: LLM-based routing.

## 4. The `_safe_id` Helper

ReactFlow generates IDs like `"node-1"`, `"abc-def-123"`. Python identifiers cannot have hyphens.
`_safe_id("node-1")` ? `"node_1"`. Prepend `n_` if ID starts with a digit.

## 5. CORS in Development

`allow_origins=["*"]` for dev (frontend on :3000, backend on :8000).
**Production**: restrict to deployed frontend domain only.

## 6. LLM Provider Abstraction

Each provider has different class names and constructor kwargs:

| Provider | Class | API key kwarg |
|---|---|---|
| openai | ChatOpenAI | api_key |
| anthropic | ChatAnthropic | api_key |
| google | ChatGoogleGenerativeAI | google_api_key |
| ollama | ChatOllama | (none — local) |

The generator uses a mapping dict so adding a provider is a one-liner.

## 7. Error Handling

- Pydantic v2: HTTP 422 auto-returned for malformed requests
- Missing provider: safe default (OpenAI) + `# WARNING` comment in generated code
- Dangling edge (references non-existent node): skip + log warning

## 8. Future Execution Engine (Phase 3+)

- Will NOT use `eval()`/`exec()` — sandbox escape risk
- Instead: build LangGraph objects programmatically in memory (same logic as generator)
- Worker thread pool to avoid blocking FastAPI event loop
- LangGraph `SqliteSaver` checkpointer for multi-turn memory
