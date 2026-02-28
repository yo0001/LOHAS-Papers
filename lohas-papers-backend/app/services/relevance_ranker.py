import datetime
import logging
import re

from app.models.schemas import RankedPaper, RankingResult, UnifiedPaper
from app.services.llm_client import llm_chat_json

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """あなたは学術論文の関連度評価エンジンです。

ユーザーの検索意図と論文リストを受け取り、各論文の関連度を評価してください。

## 評価基準

1. **ユーザー意図との直接的関連性**（最重要）: 一般ユーザーが本当に知りたい情報を含んでいるか
2. **エビデンスレベル**: メタアナリシス > システマティックレビュー > RCT > コホート研究 > ケースシリーズ > 症例報告 > 基礎研究 > 総説
3. **実用性**: 臨床的に実用的な情報を含むか（基礎研究の分子メカニズム詳細より、臨床試験の結果を優先）
4. **新しさ**: 同等のエビデンスレベルなら、新しい論文を優先
5. **被引用数**: 同等の条件なら、被引用数が多い論文を優先

## 出力形式（JSONのみ）

{
  "rankings": [
    {
      "paper_id": "元のID",
      "relevance_score": 0.95,
      "evidence_level": "high",
      "study_type": "meta-analysis",
      "reason": "ランキング理由の短い説明（英語、50語以内）"
    }
  ]
}

evidence_levelは "high", "moderate", "low" のいずれか。
study_typeは "meta-analysis", "systematic-review", "RCT", "cohort", "case-series", "case-report", "basic-research", "review", "other" のいずれか。"""

_WORD_RE = re.compile(r"[a-z0-9][a-z0-9\-]{1,}")
_STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "into",
    "using",
    "effect",
    "effects",
    "study",
    "studies",
    "analysis",
    "review",
    "clinical",
    "patients",
    "patient",
}


def _tokenize(text: str) -> set[str]:
    return {t for t in _WORD_RE.findall(text.lower()) if t not in _STOPWORDS and len(t) >= 3}


def _lexical_score(query_terms: set[str], paper: UnifiedPaper) -> float:
    if not query_terms:
        return 0.0

    title = (paper.title or "").lower()
    abstract = (paper.abstract or "").lower()
    doc_terms = _tokenize(f"{title} {abstract[:1200]}")
    if not doc_terms:
        return 0.0

    overlap = len(query_terms & doc_terms) / max(1, len(query_terms))
    phrase_boost = 0.2 if any(t in title for t in query_terms) else 0.0
    return min(1.0, overlap + phrase_boost)


def _infer_study_type(text: str) -> str:
    t = text.lower()
    if "meta-analysis" in t or "meta analysis" in t:
        return "meta-analysis"
    if "systematic review" in t:
        return "systematic-review"
    if "randomized" in t or "randomised" in t or " rct" in t:
        return "RCT"
    if "cohort" in t:
        return "cohort"
    if "case series" in t:
        return "case-series"
    if "case report" in t:
        return "case-report"
    if "in vitro" in t or "mouse" in t or "mice" in t or "mechanism" in t:
        return "basic-research"
    if "review" in t:
        return "review"
    return "other"


def _evidence_level(study_type: str) -> str:
    if study_type in {"meta-analysis", "systematic-review", "RCT"}:
        return "high"
    if study_type in {"cohort", "review"}:
        return "moderate"
    return "low"


async def rank_papers(
    user_query: str,
    interpreted_intent: str,
    papers: list[UnifiedPaper],
) -> list[RankedPaper]:
    """Use LLM to rank papers by relevance to user query.

    Candidate pre-filter uses lexical match + citation + recency so that
    highly relevant low-citation papers are not dropped too early.
    """
    if not papers:
        return []

    current_year = datetime.date.today().year
    max_citations = max((p.citation_count for p in papers), default=1) or 1
    query_terms = _tokenize(f"{user_query} {interpreted_intent}")

    def prefilter_score(p: UnifiedPaper) -> float:
        citation_score = p.citation_count / max_citations
        recency_score = max(0.0, 1 - (current_year - (p.year or 2000)) / 20)
        lexical = _lexical_score(query_terms, p)
        return lexical * 0.55 + citation_score * 0.25 + recency_score * 0.20

    # Wider candidate set than before (20 -> 40) to reduce false negatives
    candidates = sorted(papers, key=prefilter_score, reverse=True)[:40]

    # Build compact paper list for LLM (still token-aware, but less lossy than 100 chars)
    paper_list_text = ""
    for p in candidates:
        abstract_preview = (p.abstract or "")[:400]
        paper_list_text += (
            f"- ID: {p.id} | {p.year or '?'} | cite:{p.citation_count}\n"
            f"  {p.title}\n"
            f"  {abstract_preview}\n"
        )

    user_message = (
        f"ユーザーの検索クエリ: {user_query}\n"
        f"検索意図: {interpreted_intent}\n\n"
        f"論文リスト:\n{paper_list_text}"
    )

    try:
        data = await llm_chat_json(SYSTEM_PROMPT, user_message, max_tokens=4096, retries=1)
        result = RankingResult(**data)
        return result.rankings
    except Exception:
        logger.exception("Relevance ranking failed, using hybrid fallback")
        return _fallback_ranking(candidates, user_query, interpreted_intent)


def _fallback_ranking(
    papers: list[UnifiedPaper],
    user_query: str,
    interpreted_intent: str,
) -> list[RankedPaper]:
    """Fallback ranking using lexical + citation + recency (not citation-only)."""
    rankings: list[RankedPaper] = []
    current_year = datetime.date.today().year
    max_citations = max((p.citation_count for p in papers), default=1) or 1
    query_terms = _tokenize(f"{user_query} {interpreted_intent}")

    for paper in papers:
        lexical = _lexical_score(query_terms, paper)
        citation_score = paper.citation_count / max_citations
        recency_score = max(0.0, 1 - (current_year - (paper.year or 2000)) / 20)
        score = lexical * 0.60 + citation_score * 0.25 + recency_score * 0.15
        score = round(score, 3)

        inferred = _infer_study_type(f"{paper.title}\n{paper.abstract or ''}")

        rankings.append(
            RankedPaper(
                paper_id=paper.id,
                relevance_score=score,
                evidence_level=_evidence_level(inferred),
                study_type=inferred,
                reason="Fallback rank by lexical match + citations + recency",
            )
        )

    rankings.sort(key=lambda r: r.relevance_score, reverse=True)
    return rankings
