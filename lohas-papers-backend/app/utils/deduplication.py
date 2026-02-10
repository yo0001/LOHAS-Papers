import re
import logging

from app.models.schemas import UnifiedPaper

logger = logging.getLogger(__name__)


def _normalize_title(title: str) -> str:
    """Normalize a paper title for comparison."""
    t = title.lower()
    t = re.sub(r"[^\w\s]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def deduplicate_papers(papers: list[UnifiedPaper]) -> list[UnifiedPaper]:
    """Remove duplicate papers based on DOI or normalized title.

    When a duplicate is found, prefer the version with more metadata
    (Semantic Scholar usually has citation counts).
    """
    seen_dois: dict[str, int] = {}  # doi -> index in result
    seen_titles: dict[str, int] = {}  # normalized title -> index in result
    result: list[UnifiedPaper] = []

    for paper in papers:
        # Check DOI-based dedup
        if paper.doi:
            doi_lower = paper.doi.lower()
            if doi_lower in seen_dois:
                idx = seen_dois[doi_lower]
                result[idx] = _merge_papers(result[idx], paper)
                continue
            seen_dois[doi_lower] = len(result)

        # Check title-based dedup
        norm_title = _normalize_title(paper.title)
        if norm_title and norm_title in seen_titles:
            idx = seen_titles[norm_title]
            result[idx] = _merge_papers(result[idx], paper)
            continue
        if norm_title:
            seen_titles[norm_title] = len(result)

        result.append(paper)

    removed = len(papers) - len(result)
    if removed > 0:
        logger.info("Deduplication removed %d papers (%d -> %d)", removed, len(papers), len(result))

    return result


def _merge_papers(existing: UnifiedPaper, new: UnifiedPaper) -> UnifiedPaper:
    """Merge two paper records, preferring richer data."""
    return UnifiedPaper(
        id=existing.id if existing.source == "semantic_scholar" else new.id,
        title=existing.title or new.title,
        authors=existing.authors if existing.authors else new.authors,
        journal=existing.journal or new.journal,
        year=existing.year or new.year,
        doi=existing.doi or new.doi,
        pmid=existing.pmid or new.pmid,
        citation_count=max(existing.citation_count, new.citation_count),
        is_open_access=existing.is_open_access or new.is_open_access,
        pdf_url=existing.pdf_url or new.pdf_url,
        abstract=existing.abstract if existing.abstract and len(existing.abstract) > len(new.abstract or "") else new.abstract,
        source=existing.source,
    )
