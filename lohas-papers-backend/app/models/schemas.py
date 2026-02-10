from __future__ import annotations

from pydantic import BaseModel, Field


# ── Request Models ──


class SearchFilters(BaseModel):
    year_from: int | None = None
    year_to: int | None = None
    study_type: str | None = None
    open_access_only: bool = False


class SearchRequest(BaseModel):
    query: str
    language: str = "ja"
    page: int = 1
    per_page: int = 50
    sort_by: str = "relevance"
    filters: SearchFilters = Field(default_factory=SearchFilters)


class BatchSummaryRequest(BaseModel):
    paper_ids: list[str]
    language: str


# ── Response Models ──


class PaperSummaryMap(BaseModel):
    ja: str | None = None
    en: str | None = None
    zh_Hans: str | None = Field(None, alias="zh-Hans")
    ko: str | None = None

    model_config = {"populate_by_name": True}


class PaperResult(BaseModel):
    id: str
    title: str
    title_translated: str | None = None
    authors: list[str]
    journal: str | None = None
    year: int | None = None
    doi: str | None = None
    citation_count: int = 0
    study_type: str | None = None
    evidence_level: str | None = None
    is_open_access: bool = False
    pdf_url: str | None = None
    abstract_original: str | None = None
    summary: PaperSummaryMap = Field(default_factory=PaperSummaryMap)
    relevance_score: float = 0.0
    ai_relevance_reason: str | None = None


class AISummary(BaseModel):
    text: str
    language: str
    generated_queries: list[str]


class SearchResponse(BaseModel):
    ai_summary: AISummary
    papers: list[PaperResult]
    total_results: int
    page: int
    per_page: int
    cached: bool = False


class PaperSummaryResponse(BaseModel):
    paper_id: str
    language: str
    summary: str
    cached: bool = False
    generated_at: str | None = None


class BatchSummaryItem(BaseModel):
    paper_id: str
    summary: str
    cached: bool = False


class BatchSummaryResponse(BaseModel):
    summaries: list[BatchSummaryItem]


class AuthorDetail(BaseModel):
    name: str
    affiliation: str | None = None


class PaperDetailResponse(BaseModel):
    paper_id: str
    title_original: str
    title_translated: str | None = None
    authors: list[AuthorDetail]
    journal: str | None = None
    year: int | None = None
    doi: str | None = None
    abstract_original: str | None = None
    abstract_translated: str | None = None
    summary: str | None = None
    key_findings: list[str] = Field(default_factory=list)
    citation_count: int = 0
    references_count: int = 0
    is_open_access: bool = False
    pdf_url: str | None = None
    semantic_scholar_url: str | None = None
    pubmed_url: str | None = None


# ── Internal Models ──


class QueryTransformResult(BaseModel):
    original_query: str
    interpreted_intent: str
    academic_queries: list[str]
    mesh_terms: list[str] = Field(default_factory=list)
    key_concepts: dict = Field(default_factory=dict)


class RankedPaper(BaseModel):
    paper_id: str
    relevance_score: float
    evidence_level: str
    study_type: str
    reason: str


class RankingResult(BaseModel):
    rankings: list[RankedPaper]


class UnifiedPaper(BaseModel):
    """Internal unified paper representation from both APIs."""

    id: str
    title: str
    authors: list[str]
    journal: str | None = None
    year: int | None = None
    doi: str | None = None
    pmid: str | None = None
    citation_count: int = 0
    is_open_access: bool = False
    pdf_url: str | None = None
    abstract: str | None = None
    source: str = "semantic_scholar"
