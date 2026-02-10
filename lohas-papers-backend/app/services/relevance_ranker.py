import logging

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


async def rank_papers(
    user_query: str,
    interpreted_intent: str,
    papers: list[UnifiedPaper],
) -> list[RankedPaper]:
    """Use LLM to rank papers by relevance to user query.

    For efficiency, only rank the top 30 papers (by citation count as a pre-filter).
    """
    if not papers:
        return []

    # Pre-filter: take top 50 using hybrid score (citations + recency)
    # This ensures recent important papers with few citations aren't excluded
    import datetime
    current_year = datetime.date.today().year
    max_citations = max((p.citation_count for p in papers), default=1) or 1

    def hybrid_score(p: UnifiedPaper) -> float:
        citation_score = p.citation_count / max_citations  # 0-1
        recency_score = max(0, 1 - (current_year - (p.year or 2000)) / 20)  # 0-1, last 20 years
        return citation_score * 0.6 + recency_score * 0.4

    sorted_by_hybrid = sorted(papers, key=hybrid_score, reverse=True)
    candidates = sorted_by_hybrid[:30]

    # Build paper list for LLM
    paper_list_text = ""
    for p in candidates:
        abstract_preview = (p.abstract or "")[:200]
        paper_list_text += (
            f"- ID: {p.id}\n"
            f"  Title: {p.title}\n"
            f"  Year: {p.year or 'unknown'}\n"
            f"  Citations: {p.citation_count}\n"
            f"  Abstract: {abstract_preview}\n\n"
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
        logger.exception("Relevance ranking failed, using citation-based fallback")
        return _fallback_ranking(candidates)


def _fallback_ranking(papers: list[UnifiedPaper]) -> list[RankedPaper]:
    """Fallback ranking based on citation count when LLM fails."""
    rankings = []
    max_citations = max((p.citation_count for p in papers), default=1) or 1

    for paper in papers:
        score = round(paper.citation_count / max_citations, 2)
        rankings.append(
            RankedPaper(
                paper_id=paper.id,
                relevance_score=score,
                evidence_level="moderate",
                study_type="other",
                reason="Ranked by citation count (LLM fallback)",
            )
        )

    return rankings
