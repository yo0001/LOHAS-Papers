import asyncio
import logging

import httpx

from app.config import get_settings
from app.models.schemas import UnifiedPaper

logger = logging.getLogger(__name__)

BASE_URL = "https://api.semanticscholar.org/graph/v1"
FIELDS = "title,abstract,authors,year,citationCount,journal,isOpenAccess,openAccessPdf,externalIds,publicationTypes,tldr"
TIMEOUT = 10.0


async def search_papers(
    query: str,
    *,
    limit: int = 20,
    year_from: int | None = None,
    year_to: int | None = None,
) -> list[UnifiedPaper]:
    """Search Semantic Scholar for papers matching the query."""
    settings = get_settings()

    params: dict = {
        "query": query,
        "limit": limit,
        "fields": FIELDS,
    }

    if year_from or year_to:
        y_from = year_from or ""
        y_to = year_to or ""
        params["year"] = f"{y_from}-{y_to}"

    headers = {}
    if settings.semantic_scholar_api_key:
        headers["x-api-key"] = settings.semantic_scholar_api_key

    max_retries = 3
    data = None
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                resp = await client.get(
                    f"{BASE_URL}/paper/search",
                    params=params,
                    headers=headers,
                )
                resp.raise_for_status()
                data = resp.json()
                break
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and attempt < max_retries - 1:
                wait = 2 ** attempt + 1
                logger.info("Semantic Scholar 429, retrying in %ds: %s", wait, query)
                await asyncio.sleep(wait)
                continue
            logger.warning("Semantic Scholar HTTP error %s: %s", e.response.status_code, query)
            return []
        except httpx.TimeoutException:
            logger.warning("Semantic Scholar timeout for query: %s", query)
            return []
        except Exception:
            logger.exception("Semantic Scholar unexpected error for query: %s", query)
            return []

    if data is None:
        return []

    papers: list[UnifiedPaper] = []
    for item in data.get("data", []):
        if not item:
            continue

        paper_id = item.get("paperId", "")
        if not paper_id:
            continue

        # Extract DOI from externalIds
        external_ids = item.get("externalIds") or {}
        doi = external_ids.get("DOI")
        pmid = external_ids.get("PubMed")

        # Extract authors
        authors_raw = item.get("authors") or []
        authors = [a.get("name", "") for a in authors_raw if a.get("name")]

        # Extract journal name
        journal_info = item.get("journal") or {}
        journal = journal_info.get("name") if isinstance(journal_info, dict) else None

        # Open access PDF
        oa_pdf = item.get("openAccessPdf") or {}
        pdf_url = oa_pdf.get("url") if isinstance(oa_pdf, dict) else None

        papers.append(
            UnifiedPaper(
                id=paper_id,
                title=item.get("title", ""),
                authors=authors,
                journal=journal,
                year=item.get("year"),
                doi=doi,
                pmid=pmid,
                citation_count=item.get("citationCount") or 0,
                is_open_access=item.get("isOpenAccess", False),
                pdf_url=pdf_url,
                abstract=item.get("abstract"),
                source="semantic_scholar",
            )
        )

    logger.info("Semantic Scholar returned %d papers for: %s", len(papers), query)
    return papers
