import asyncio
import logging

from fastapi import APIRouter

from app.cache import sqlite_cache as redis_client
from app.models.schemas import (
    AISummary,
    PaperResult,
    PaperSummaryMap,
    QueryTransformResult,
    RankedPaper,
    SearchRequest,
    SearchResponse,
    UnifiedPaper,
)
from app.services import paper_searcher, query_transformer, relevance_ranker, summarizer

logger = logging.getLogger(__name__)
router = APIRouter()

# Timeout per individual summary/overview task (seconds)
_SUMMARY_TIMEOUT = 15.0


def _normalize_study_type(study_type: str | None) -> str:
    if not study_type:
        return ""
    t = study_type.strip().lower().replace("_", "-")
    # normalize loose values
    if t in {"systematic review", "systematicreview"}:
        return "systematic-review"
    if t in {"meta analysis", "metaanalysis"}:
        return "meta-analysis"
    if t in {"randomized", "randomised", "rct"}:
        return "rct"
    return t


def _relevance_score(paper_id: str, ranking_map: dict[str, RankedPaper]) -> float:
    info = ranking_map.get(paper_id)
    return info.relevance_score if info else 0.0


def _sort_papers(
    papers: list[UnifiedPaper],
    ranking_map: dict[str, RankedPaper],
    sort_by: str,
) -> list[UnifiedPaper]:
    mode = (sort_by or "relevance").strip().lower()

    if mode in {"citations", "citation", "citation_count", "most_cited"}:
        return sorted(
            papers,
            key=lambda p: (p.citation_count or 0, _relevance_score(p.id, ranking_map)),
            reverse=True,
        )

    if mode in {"newest", "latest", "year", "year_desc"}:
        return sorted(
            papers,
            key=lambda p: ((p.year or 0), _relevance_score(p.id, ranking_map), (p.citation_count or 0)),
            reverse=True,
        )

    if mode in {"oldest", "year_asc"}:
        return sorted(
            papers,
            key=lambda p: ((p.year or 9999), -_relevance_score(p.id, ranking_map), -(p.citation_count or 0)),
            reverse=False,
        )

    # default: relevance
    return sorted(
        papers,
        key=lambda p: (_relevance_score(p.id, ranking_map), (p.citation_count or 0), (p.year or 0)),
        reverse=True,
    )


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest) -> SearchResponse:
    """Main search endpoint: query transform -> paper search -> rank -> summarize."""

    filters_payload = request.filters.model_dump() if request.filters else {}

    # 1. Check search result cache
    cached = await redis_client.get_cached_search(
        request.query,
        request.page,
        request.per_page,
        request.language,
        request.sort_by,
        filters_payload,
    )
    if cached:
        cached["cached"] = True
        return SearchResponse(**cached)

    # 2. Transform query (with cache)
    transform_result = await _get_or_transform_query(request.query, request.language)

    # 3. Search all sources in parallel (no sleep, fully parallel)
    all_papers = await paper_searcher.search_all_sources(
        transform_result,
        year_from=request.filters.year_from,
        year_to=request.filters.year_to,
    )

    # Apply open-access filter BEFORE ranking (cheaper + semantically correct)
    if request.filters.open_access_only:
        all_papers = [p for p in all_papers if p.is_open_access]

    if not all_papers:
        return SearchResponse(
            ai_summary=AISummary(
                text="",
                language=request.language,
                generated_queries=transform_result.academic_queries,
            ),
            papers=[],
            total_results=0,
            page=request.page,
            per_page=request.per_page,
        )

    # 4. Run ranking + title translation in parallel
    ranking_task = relevance_ranker.rank_papers(
        request.query, transform_result.interpreted_intent, all_papers
    )
    title_translation_task = summarizer.translate_titles_batch(
        [p.title for p in all_papers], request.language
    )
    ranking_result, translation_result = await asyncio.gather(
        ranking_task, title_translation_task, return_exceptions=True
    )

    rankings = ranking_result if not isinstance(ranking_result, Exception) else []
    all_translated_titles = (
        translation_result
        if not isinstance(translation_result, Exception)
        else [p.title for p in all_papers]
    )

    # Build title translation lookup
    title_translation_map: dict[str, str] = {}
    for i, paper in enumerate(all_papers):
        if i < len(all_translated_titles) and all_translated_titles[i] != paper.title:
            title_translation_map[paper.id] = all_translated_titles[i]

    # 5. Build ranked paper lookup
    ranking_map: dict[str, RankedPaper] = {r.paper_id: r for r in rankings}

    # Apply study_type filter AFTER ranking (needs rank output)
    filtered_papers = all_papers
    requested_study_type = _normalize_study_type(request.filters.study_type)
    if requested_study_type:
        filtered_papers = [
            p
            for p in filtered_papers
            if _normalize_study_type((ranking_map.get(p.id).study_type if ranking_map.get(p.id) else None))
            == requested_study_type
        ]

    # 6. Sort + paginate
    sorted_papers = _sort_papers(filtered_papers, ranking_map, request.sort_by)
    total_results = len(sorted_papers)

    start = (request.page - 1) * request.per_page
    end = start + request.per_page
    page_papers = sorted_papers[start:end]

    # 7. Generate summaries + AI overview in parallel (with per-task timeout)
    summary_tasks = []
    for paper in page_papers:
        if paper.abstract:
            summary_tasks.append(
                _with_timeout(
                    _get_or_generate_summary(
                        paper.id, paper.abstract, request.language, paper.title
                    ),
                    _SUMMARY_TIMEOUT,
                )
            )
        else:
            summary_tasks.append(_return_empty())

    papers_context = _build_papers_context(page_papers[:5])
    ai_overview_task = _with_timeout(
        summarizer.generate_ai_overview(request.query, request.language, papers_context),
        _SUMMARY_TIMEOUT,
    )

    all_tasks = [ai_overview_task] + summary_tasks
    results = await asyncio.gather(*all_tasks, return_exceptions=True)

    ai_overview_text = results[0] if not isinstance(results[0], Exception) else ""
    paper_summaries = results[1:]

    # 8. Build response
    paper_results: list[PaperResult] = []
    for i, paper in enumerate(page_papers):
        rank_info = ranking_map.get(paper.id)
        summary_text = (
            paper_summaries[i] if not isinstance(paper_summaries[i], Exception) else ""
        )

        summary_map = PaperSummaryMap()
        if summary_text:
            lang = request.language
            if lang == "ja":
                summary_map.ja = summary_text
            elif lang == "en":
                summary_map.en = summary_text
            elif lang == "zh-Hans":
                summary_map.zh_Hans = summary_text
            elif lang == "ko":
                summary_map.ko = summary_text
            elif lang == "es":
                summary_map.es = summary_text
            elif lang == "pt-BR":
                summary_map.pt_BR = summary_text
            elif lang == "th":
                summary_map.th = summary_text
            elif lang == "vi":
                summary_map.vi = summary_text

        paper_results.append(
            PaperResult(
                id=paper.id,
                title=paper.title,
                title_translated=title_translation_map.get(paper.id),
                authors=paper.authors,
                journal=paper.journal,
                year=paper.year,
                doi=paper.doi,
                citation_count=paper.citation_count,
                study_type=rank_info.study_type if rank_info else None,
                evidence_level=rank_info.evidence_level if rank_info else None,
                is_open_access=paper.is_open_access,
                pdf_url=paper.pdf_url,
                abstract_original=paper.abstract,
                summary=summary_map,
                relevance_score=rank_info.relevance_score if rank_info else 0.0,
                ai_relevance_reason=rank_info.reason if rank_info else None,
            )
        )

    response = SearchResponse(
        ai_summary=AISummary(
            text=ai_overview_text,
            language=request.language,
            generated_queries=transform_result.academic_queries,
        ),
        papers=paper_results,
        total_results=total_results,
        page=request.page,
        per_page=request.per_page,
    )

    # 9. Cache the result with sort/filter-aware key
    await redis_client.set_cached_search(
        request.query,
        request.page,
        request.per_page,
        response.model_dump(by_alias=True),
        language=request.language,
        sort_by=request.sort_by,
        filters=filters_payload,
    )

    # 10. Do NOT precache other languages on initial search.
    # Generate summaries only for the currently requested language
    # to avoid unnecessary token burn.
    # (Language switching is handled separately via /summary/batch.)

    return response


async def _with_timeout(coro, timeout: float):
    """Wrap a coroutine with a timeout. Returns empty string on timeout."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning("Task timed out after %.1fs", timeout)
        return ""


async def _get_or_transform_query(query: str, language: str) -> QueryTransformResult:
    """Get cached transform or generate new one."""
    cached = await redis_client.get_cached_transform(query, language)
    if cached:
        return QueryTransformResult(**cached)

    result = await query_transformer.transform_query(query, language)
    await redis_client.set_cached_transform(query, result.model_dump(), language=language)
    return result


async def _get_or_generate_summary(
    paper_id: str, abstract: str, language: str, title: str = ""
) -> str:
    """Get cached summary or generate new one."""
    cached = await redis_client.get_cached_summary(paper_id, language)
    if cached:
        return cached

    summary = await summarizer.generate_paper_summary(abstract, language, title)
    if summary:
        await redis_client.set_cached_summary(paper_id, language, summary)
    return summary


async def _return_empty() -> str:
    return ""


def _build_papers_context(papers: list[UnifiedPaper]) -> str:
    """Build a text summary of papers for AI overview generation."""
    parts = []
    for i, p in enumerate(papers, 1):
        abstract_preview = (p.abstract or "")[:300]
        parts.append(
            f"{i}. {p.title} ({p.journal or 'unknown'}, {p.year or 'unknown'})\n"
            f"   Citations: {p.citation_count}\n"
            f"   Abstract: {abstract_preview}\n"
        )
    return "\n".join(parts)


async def _precache_top_papers(papers: list[UnifiedPaper]) -> None:
    """Background task to precache summaries for top papers in all 8 languages."""
    all_languages = ["ja", "en", "zh-Hans", "ko", "es", "pt-BR", "th", "vi"]
    for paper in papers:
        if not paper.abstract:
            continue
        for lang in all_languages:
            cached = await redis_client.get_cached_summary(paper.id, lang)
            if not cached:
                try:
                    summary = await summarizer.generate_paper_summary(
                        paper.abstract, lang, paper.title
                    )
                    if summary:
                        await redis_client.set_cached_summary(paper.id, lang, summary)
                except Exception:
                    logger.warning(
                        "Precache failed for %s/%s", paper.id, lang, exc_info=True
                    )
