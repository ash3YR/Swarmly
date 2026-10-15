"""Main entry point for Swarmly FastAPI backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv

load_dotenv()

from src.api.generate import router as generate_router
from src.api.projects import router as projects_router
from src.api.workflows import router as workflows_router

app = FastAPI(title="Swarmly API", description="Backend for Swarmly LangGraph agent builder")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router)
app.include_router(projects_router)
app.include_router(workflows_router)

@app.get("/")
async def health_check() -> dict:
    """Root health check endpoint."""
    return {"status": "ok", "service": "Swarmly API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
