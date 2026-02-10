import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.cache import sqlite_cache as redis_client
from app.config import get_settings
from app.models.schemas import AuthorDetail, PaperDetailResponse, PaperSummaryResponse
from app.services.summarizer import generate_paper_summary

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/paper/{paper_id}/summary", response_model=PaperSummaryResponse)
async def get_paper_summary(
    paper_id: str,
    language: str = Query(default="ja"),
) -> PaperSummaryResponse:
    """Get or generate a summary for a specific paper in the specified language."""

    # Check cache
    cached = await redis_client.get_cached_summary(paper_id, language)
    if cached:
        return PaperSummaryResponse(
            paper_id=paper_id,
            language=language,
            summary=cached,
            cached=True,
        )

    # Fetch paper abstract from Semantic Scholar
    paper_data = await _fetch_paper_from_semantic_scholar(paper_id)
    if not paper_data or not paper_data.get("abstract"):
        raise HTTPException(status_code=404, detail="Paper not found or no abstract available")

    abstract = paper_data["abstract"]
    title = paper_data.get("title", "")

    # Generate summary
    summary = await generate_paper_summary(abstract, language, title)
    if not summary:
        raise HTTPException(status_code=500, detail="Failed to generate summary")

    # Cache it
    await redis_client.set_cached_summary(paper_id, language, summary)

    return PaperSummaryResponse(
        paper_id=paper_id,
        language=language,
        summary=summary,
        cached=False,
    )


@router.get("/paper/{paper_id}/detail", response_model=PaperDetailResponse)
async def get_paper_detail(
    paper_id: str,
    language: str = Query(default="ja"),
) -> PaperDetailResponse:
    """Get full paper details including translated abstract."""

    paper_data = await _fetch_paper_from_semantic_scholar(paper_id)
    if not paper_data:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Get or generate summary
    abstract = paper_data.get("abstract", "")
    title = paper_data.get("title", "")
    summary = ""
    abstract_translated = None

    if abstract:
        cached_summary = await redis_client.get_cached_summary(paper_id, language)
        if cached_summary:
            summary = cached_summary
        else:
            summary = await generate_paper_summary(abstract, language, title)
            if summary:
                await redis_client.set_cached_summary(paper_id, language, summary)

        # For non-English languages, the abstract translation is the summary itself
        # (a more detailed translation could be added later)
        if language != "en":
            abstract_translated = summary

    # Parse authors
    authors_raw = paper_data.get("authors") or []
    authors = [
        AuthorDetail(
            name=a.get("name", ""),
            affiliation=(a.get("affiliations") or [None])[0] if a.get("affiliations") else None,
        )
        for a in authors_raw
    ]

    # Journal
    journal_info = paper_data.get("journal") or {}
    journal = journal_info.get("name") if isinstance(journal_info, dict) else None

    # External IDs
    external_ids = paper_data.get("externalIds") or {}
    doi = external_ids.get("DOI")
    pmid = external_ids.get("PubMed")

    # URLs
    semantic_scholar_url = f"https://www.semanticscholar.org/paper/{paper_id}"
    pubmed_url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}" if pmid else None

    # Open access PDF
    oa_pdf = paper_data.get("openAccessPdf") or {}
    pdf_url = oa_pdf.get("url") if isinstance(oa_pdf, dict) else None

    return PaperDetailResponse(
        paper_id=paper_id,
        title_original=title,
        title_translated=None,  # Could add title translation later
        authors=authors,
        journal=journal,
        year=paper_data.get("year"),
        doi=doi,
        abstract_original=abstract,
        abstract_translated=abstract_translated,
        summary=summary,
        key_findings=[],  # Could be extracted by LLM later
        citation_count=paper_data.get("citationCount", 0),
        references_count=paper_data.get("referenceCount", 0),
        is_open_access=paper_data.get("isOpenAccess", False),
        pdf_url=pdf_url,
        semantic_scholar_url=semantic_scholar_url,
        pubmed_url=pubmed_url,
    )


async def _fetch_paper_from_semantic_scholar(paper_id: str) -> dict | None:
    """Fetch a single paper from Semantic Scholar by ID."""
    settings = get_settings()
    fields = "title,abstract,authors,year,citationCount,referenceCount,journal,isOpenAccess,openAccessPdf,externalIds"
    url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}"

    headers = {}
    if settings.semantic_scholar_api_key:
        headers["x-api-key"] = settings.semantic_scholar_api_key

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params={"fields": fields}, headers=headers)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
    except Exception:
        logger.exception("Failed to fetch paper %s from Semantic Scholar", paper_id)
        return None
