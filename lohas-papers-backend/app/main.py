import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import paper, search, summary

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# ── Docs visibility (disabled in production) ──
docs_url = "/docs" if os.getenv("ENVIRONMENT") == "development" else None
redoc_url = "/redoc" if os.getenv("ENVIRONMENT") == "development" else None
openapi_url = "/openapi.json" if os.getenv("ENVIRONMENT") == "development" else None

app = FastAPI(
    title="LOHAS Papers API",
    description="AI-powered academic paper search and multilingual summarization",
    version="0.1.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
)


# ── API Key authentication middleware ──
API_SECRET_KEY = os.getenv("API_SECRET_KEY")

# Paths that skip API key check
_PUBLIC_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}


class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip check if API_SECRET_KEY is not configured (dev convenience)
        if not API_SECRET_KEY:
            return await call_next(request)

        # Skip public paths
        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        # Check X-API-Key header
        provided_key = request.headers.get("X-API-Key")
        if provided_key != API_SECRET_KEY:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing API key"},
            )

        return await call_next(request)


app.add_middleware(APIKeyMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://lohas-papers.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/v1", tags=["search"])
app.include_router(paper.router, prefix="/api/v1", tags=["paper"])
app.include_router(summary.router, prefix="/api/v1", tags=["summary"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
