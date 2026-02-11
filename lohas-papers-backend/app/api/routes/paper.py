import asyncio
import json
import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.cache import sqlite_cache as redis_client
from app.config import get_settings
from app.models.schemas import (
    AbstractTranslations,
    AuthorDetail,
    FulltextSection,
    FulltextTranslationResponse,
    PaperDetailResponse,
    PaperSummaryResponse,
)
from app.services.pdf_extractor import extract_text_from_url, split_into_sections
from app.services.summarizer import (
    generate_paper_summary,
    translate_abstract,
    translate_abstract_all_levels,
    translate_fulltext_sections,
)

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
    abstract_translations = None

    if abstract:
        cached_summary = await redis_client.get_cached_summary(paper_id, language)
        if cached_summary:
            summary = cached_summary
        else:
            summary = await generate_paper_summary(abstract, language, title)
            if summary:
                await redis_client.set_cached_summary(paper_id, language, summary)

        # For non-English languages, the abstract translation is the summary itself
        if language != "en":
            abstract_translated = summary

        # Generate 3-level abstract translations
        abstract_translations = await _get_abstract_translations(
            paper_id, abstract, language, title
        )

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
        abstract_translations=abstract_translations,
        summary=summary,
        key_findings=[],  # Could be extracted by LLM later
        citation_count=paper_data.get("citationCount", 0),
        references_count=paper_data.get("referenceCount", 0),
        is_open_access=paper_data.get("isOpenAccess", False),
        pdf_url=pdf_url,
        semantic_scholar_url=semantic_scholar_url,
        pubmed_url=pubmed_url,
    )


@router.get("/paper/{paper_id}/fulltext", response_model=FulltextTranslationResponse)
async def get_paper_fulltext(
    paper_id: str,
    language: str = Query(default="ja"),
    difficulty: str = Query(default="layperson"),
) -> FulltextTranslationResponse:
    """Extract and translate the full text of a paper from its PDF.

    Only works for open access papers with a PDF URL.
    """
    # Validate difficulty
    if difficulty not in ("expert", "layperson", "children"):
        difficulty = "layperson"

    # Check fulltext cache first
    cached_data = await redis_client.get_cached_fulltext(paper_id, language, difficulty)
    if cached_data:
        sections_raw = json.loads(cached_data)
        return FulltextTranslationResponse(
            paper_id=paper_id,
            language=language,
            difficulty=difficulty,
            sections=[FulltextSection(**s) for s in sections_raw],
            cached=True,
        )

    # Fetch paper metadata to get PDF URL
    paper_data = await _fetch_paper_from_semantic_scholar(paper_id)
    if not paper_data:
        raise HTTPException(status_code=404, detail="Paper not found")

    oa_pdf = paper_data.get("openAccessPdf") or {}
    pdf_url = oa_pdf.get("url") if isinstance(oa_pdf, dict) else None
    if not pdf_url:
        raise HTTPException(
            status_code=404,
            detail="No PDF available for this paper (not open access)",
        )

    # Extract text from PDF
    try:
        full_text = await extract_text_from_url(pdf_url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    # Split into sections
    sections = split_into_sections(full_text)
    logger.info("Paper %s: extracted %d sections from PDF", paper_id, len(sections))

    # Translate all sections in parallel
    translated = await translate_fulltext_sections(sections, language, difficulty)

    # Cache the result
    await redis_client.set_cached_fulltext(
        paper_id, language, difficulty,
        json.dumps(translated, ensure_ascii=False),
    )

    return FulltextTranslationResponse(
        paper_id=paper_id,
        language=language,
        difficulty=difficulty,
        sections=[FulltextSection(**s) for s in translated],
        cached=False,
    )


async def _get_abstract_translations(
    paper_id: str,
    abstract: str,
    language: str,
    title: str,
) -> AbstractTranslations:
    """Get or generate 3-level abstract translations with caching."""
    difficulties = ["expert", "layperson", "children"]

    # Check cache for all 3 levels
    cached: dict[str, str | None] = {}
    for d in difficulties:
        cached[d] = await redis_client.get_cached_translation(paper_id, language, d)

    uncached = [d for d in difficulties if not cached[d]]

    if uncached:
        # For English expert level, just use the original abstract
        if language == "en" and "expert" in uncached:
            cached["expert"] = abstract
            await redis_client.set_cached_translation(paper_id, language, "expert", abstract)
            uncached.remove("expert")

        # Generate uncached translations in parallel
        if uncached:
            tasks = [
                translate_abstract(abstract, language, d, title)
                for d in uncached
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for d, result in zip(uncached, results):
                if isinstance(result, Exception):
                    logger.warning("Translation failed for %s/%s: %s", d, language, result)
                    cached[d] = ""
                else:
                    cached[d] = result or ""
                    if cached[d]:
                        await redis_client.set_cached_translation(paper_id, language, d, cached[d])

    return AbstractTranslations(
        expert=cached.get("expert") or None,
        layperson=cached.get("layperson") or None,
        children=cached.get("children") or None,
    )


async def _fetch_paper_from_semantic_scholar(paper_id: str) -> dict | None:
    """Fetch a single paper from Semantic Scholar by ID with cache and retry."""
    # Check cache first
    cached = await redis_client.get_cached_paper_metadata(paper_id)
    if cached:
        return cached

    settings = get_settings()
    fields = "title,abstract,authors,year,citationCount,referenceCount,journal,isOpenAccess,openAccessPdf,externalIds"
    url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}"

    headers = {}
    if settings.semantic_scholar_api_key:
        headers["x-api-key"] = settings.semantic_scholar_api_key

    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params={"fields": fields}, headers=headers)
                if resp.status_code == 404:
                    return None
                if resp.status_code == 429:
                    wait = 1.0 * (attempt + 1)
                    logger.warning("Semantic Scholar rate limited (429), retrying in %.1fs (attempt %d/%d)", wait, attempt + 1, max_retries)
                    await asyncio.sleep(wait)
                    continue
                resp.raise_for_status()
                data = resp.json()
                # Cache paper metadata for 24 hours
                await redis_client.set_cached_paper_metadata(paper_id, data)
                return data
        except Exception:
            logger.exception("Failed to fetch paper %s from Semantic Scholar (attempt %d/%d)", paper_id, attempt + 1, max_retries)
            if attempt < max_retries - 1:
                await asyncio.sleep(1.0 * (attempt + 1))
            else:
                return None
    return None
