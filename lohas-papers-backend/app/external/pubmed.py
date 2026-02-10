import asyncio
import logging
import xml.etree.ElementTree as ET

import httpx

from app.config import get_settings
from app.models.schemas import UnifiedPaper

logger = logging.getLogger(__name__)

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
TIMEOUT = 10.0


async def search_papers(
    query: str,
    *,
    limit: int = 20,
    year_from: int | None = None,
    year_to: int | None = None,
) -> list[UnifiedPaper]:
    """Search PubMed for papers matching the query."""
    settings = get_settings()

    # Add date filter to query if specified
    date_filter = ""
    if year_from:
        date_filter += f" AND {year_from}[PDAT]"
    if year_to:
        date_filter += f" AND {year_to}[PDAT]"

    search_params: dict = {
        "db": "pubmed",
        "term": query + date_filter,
        "retmax": limit,
        "sort": "relevance",
        "retmode": "json",
    }
    if settings.pubmed_api_key:
        search_params["api_key"] = settings.pubmed_api_key

    xml_text = None
    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                # Step 1: ESearch to get PMIDs
                resp = await client.get(ESEARCH_URL, params=search_params)
                resp.raise_for_status()
                search_data = resp.json()

                id_list = search_data.get("esearchresult", {}).get("idlist", [])
                if not id_list:
                    return []

                # Step 2: EFetch to get full records
                fetch_params: dict = {
                    "db": "pubmed",
                    "id": ",".join(id_list),
                    "retmode": "xml",
                }
                if settings.pubmed_api_key:
                    fetch_params["api_key"] = settings.pubmed_api_key

                resp = await client.get(EFETCH_URL, params=fetch_params)
                resp.raise_for_status()
                xml_text = resp.text
                break
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and attempt < max_retries - 1:
                wait = 2 ** attempt + 1
                logger.info("PubMed 429, retrying in %ds: %s", wait, query)
                await asyncio.sleep(wait)
                continue
            logger.warning("PubMed HTTP error %s: %s", e.response.status_code, query)
            return []
        except httpx.TimeoutException:
            logger.warning("PubMed timeout for query: %s", query)
            return []
        except Exception:
            logger.exception("PubMed unexpected error for query: %s", query)
            return []

    if xml_text is None:
        return []

    return _parse_pubmed_xml(xml_text)


def _parse_pubmed_xml(xml_text: str) -> list[UnifiedPaper]:
    """Parse PubMed XML response into UnifiedPaper objects."""
    papers: list[UnifiedPaper] = []

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        logger.error("Failed to parse PubMed XML")
        return []

    for article_elem in root.findall(".//PubmedArticle"):
        try:
            paper = _parse_single_article(article_elem)
            if paper:
                papers.append(paper)
        except Exception:
            logger.warning("Failed to parse PubMed article", exc_info=True)
            continue

    logger.info("PubMed returned %d papers", len(papers))
    return papers


def _parse_single_article(article_elem: ET.Element) -> UnifiedPaper | None:
    """Parse a single PubmedArticle XML element."""
    medline = article_elem.find(".//MedlineCitation")
    if medline is None:
        return None

    # PMID
    pmid_elem = medline.find("PMID")
    pmid = pmid_elem.text if pmid_elem is not None else None
    if not pmid:
        return None

    article = medline.find("Article")
    if article is None:
        return None

    # Title
    title_elem = article.find("ArticleTitle")
    title = title_elem.text if title_elem is not None else ""

    # Abstract
    abstract_parts = []
    abstract_elem = article.find("Abstract")
    if abstract_elem is not None:
        for abs_text in abstract_elem.findall("AbstractText"):
            label = abs_text.get("Label", "")
            text = abs_text.text or ""
            if label:
                abstract_parts.append(f"{label}: {text}")
            else:
                abstract_parts.append(text)
    abstract = " ".join(abstract_parts) if abstract_parts else None

    # Authors
    authors = []
    author_list = article.find("AuthorList")
    if author_list is not None:
        for author in author_list.findall("Author"):
            last = author.findtext("LastName", "")
            first = author.findtext("ForeName", "")
            if last:
                authors.append(f"{first} {last}".strip())

    # Journal
    journal_elem = article.find("Journal/Title")
    journal = journal_elem.text if journal_elem is not None else None

    # Year
    year = None
    pub_date = article.find("Journal/JournalIssue/PubDate")
    if pub_date is not None:
        year_elem = pub_date.find("Year")
        if year_elem is not None and year_elem.text:
            try:
                year = int(year_elem.text)
            except ValueError:
                pass

    # DOI
    doi = None
    for eid in article.findall("ELocationID"):
        if eid.get("EIdType") == "doi":
            doi = eid.text
            break

    return UnifiedPaper(
        id=f"pmid:{pmid}",
        title=title,
        authors=authors,
        journal=journal,
        year=year,
        doi=doi,
        pmid=pmid,
        citation_count=0,  # PubMed doesn't provide citation counts directly
        is_open_access=False,  # Would need PMC check
        pdf_url=None,
        abstract=abstract,
        source="pubmed",
    )
