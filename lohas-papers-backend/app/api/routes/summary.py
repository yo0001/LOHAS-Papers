import asyncio
import logging

from fastapi import APIRouter

from app.cache import sqlite_cache as redis_client
from app.models.schemas import BatchSummaryItem, BatchSummaryRequest, BatchSummaryResponse
from app.services.summarizer import generate_paper_summary

logger = logging.getLogger(__name__)
router = APIRouter()


async def _fetch_paper_abstract(paper_id: str) -> tuple[str, str]:
    """Fetch abstract and title for a paper from Semantic Scholar."""
    # Reuse the helper from the paper route
    from app.api.routes.paper import _fetch_paper_from_semantic_scholar

    data = await _fetch_paper_from_semantic_scholar(paper_id)
    if data:
        return data.get("abstract", ""), data.get("title", "")
    return "", ""


@router.post("/summary/batch", response_model=BatchSummaryResponse)
async def batch_summaries(request: BatchSummaryRequest) -> BatchSummaryResponse:
    """Get summaries for multiple papers in the specified language.

    Used when the user switches language — fetches cached or generates new summaries.
    """

    async def get_one(paper_id: str) -> BatchSummaryItem:
        # Check cache first
        cached = await redis_client.get_cached_summary(paper_id, request.language)
        if cached:
            return BatchSummaryItem(paper_id=paper_id, summary=cached, cached=True)

        # Need to generate — fetch abstract first
        abstract, title = await _fetch_paper_abstract(paper_id)
        if not abstract:
            return BatchSummaryItem(paper_id=paper_id, summary="", cached=False)

        summary = await generate_paper_summary(abstract, request.language, title)
        if summary:
            await redis_client.set_cached_summary(paper_id, request.language, summary)

        return BatchSummaryItem(paper_id=paper_id, summary=summary, cached=False)

    # Run all in parallel
    tasks = [get_one(pid) for pid in request.paper_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    summaries = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.warning("Batch summary failed for %s: %s", request.paper_ids[i], result)
            summaries.append(
                BatchSummaryItem(paper_id=request.paper_ids[i], summary="", cached=False)
            )
        else:
            summaries.append(result)

    return BatchSummaryResponse(summaries=summaries)
