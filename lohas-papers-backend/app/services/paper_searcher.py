import asyncio
import logging

from app.external import pubmed, semantic_scholar
from app.models.schemas import QueryTransformResult, UnifiedPaper
from app.utils.deduplication import deduplicate_papers

logger = logging.getLogger(__name__)


async def search_all_sources(
    transform_result: QueryTransformResult,
    *,
    year_from: int | None = None,
    year_to: int | None = None,
    limit_per_query: int = 20,
) -> list[UnifiedPaper]:
    """Search both Semantic Scholar and PubMed in parallel for all academic queries,
    then merge and deduplicate the results."""

    queries = transform_result.academic_queries

    # Fire all queries to both sources in parallel.
    # Retry with exponential backoff (already in each client) handles 429.
    tasks = []
    for query in queries:
        tasks.append(
            semantic_scholar.search_papers(
                query, limit=limit_per_query, year_from=year_from, year_to=year_to
            )
        )
        tasks.append(
            pubmed.search_papers(
                query, limit=limit_per_query, year_from=year_from, year_to=year_to
            )
        )

    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_papers: list[UnifiedPaper] = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.warning("Search task %d failed: %s", i, result)
            continue
        all_papers.extend(result)

    logger.info("Total papers before dedup: %d", len(all_papers))

    # Deduplicate
    unique_papers = deduplicate_papers(all_papers)
    logger.info("Total papers after dedup: %d", len(unique_papers))

    return unique_papers
