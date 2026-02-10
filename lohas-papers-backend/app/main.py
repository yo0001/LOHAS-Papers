import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import paper, search, summary

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="LOHAS Papers API",
    description="AI-powered academic paper search and multilingual summarization",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
