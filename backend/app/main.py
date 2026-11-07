from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .routers import (
    admin,
    ai_advisor,
    analytics,
    auth,
    events,
    expenses,
    lending,
    shared,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=f"{settings.PROJECT_TAGLINE} — Unified personal and collaborative finance management for India.",
    version="1.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(expenses.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(shared.router, prefix="/api/v1")
app.include_router(lending.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(ai_advisor.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "tagline": settings.PROJECT_TAGLINE,
        "status": "online",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "dhanmool-api"}
