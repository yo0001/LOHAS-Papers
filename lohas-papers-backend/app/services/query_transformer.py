import logging
import re

from app.models.schemas import QueryTransformResult
from app.services.llm_client import llm_chat_json

logger = logging.getLogger(__name__)

# ── Query sanitization ──
_MAX_QUERY_LENGTH = 500


def _sanitize_query(query: str) -> str:
    """Sanitize user query to mitigate prompt injection and abuse."""
    # Truncate to max length
    query = query[:_MAX_QUERY_LENGTH]
    # Remove common prompt injection patterns
    query = re.sub(
        r"(ignore\s+(previous|above|all)\s+instructions|"
        r"you\s+are\s+now|"
        r"system\s*:\s*|"
        r"<\|.*?\|>|"
        r"\{\{.*?\}\})",
        "",
        query,
        flags=re.IGNORECASE,
    )
    # Strip excessive whitespace
    query = re.sub(r"\s+", " ", query).strip()
    return query

SYSTEM_PROMPT = """あなたは医学・科学分野の学術検索クエリ最適化エンジンです。

ユーザーが日常的な言葉で入力した検索クエリを、PubMedおよびSemantic Scholarで高品質な結果を返す学術検索クエリに変換してください。

## ルール

1. ユーザーの入力言語に関わらず、生成するクエリは全て英語にすること
2. **3個**のクエリを生成すること。それぞれ異なる戦略を使うこと：
   - **クエリ1（高精度）**: ユーザーの意図に最も直接的に合致する具体的なクエリ。研究デザイン指定なし。
   - **クエリ2（同義語展開）**: クエリ1の主要概念をOR演算子で同義語・類義語に展開したクエリ。薬剤なら一般名と商品名の両方、疾患なら別名・略称を含める。例: (semaglutide OR liraglutide OR GLP-1 receptor agonist)
   - **クエリ3（PICO構造）**: PICO（Patient/Intervention/Comparison/Outcome）に基づいた構造化クエリ。各要素をANDで結合。
3. 以下の変換を必ず行うこと：
   - 日常語 → 正式な医学用語（例: 「ダイエット 薬」→ "anti-obesity agents", "weight loss pharmacotherapy"）
   - ブランド名 → 一般名 + ブランド名のOR（例: 「オゼンピック」→ "(semaglutide OR Ozempic)"）
   - 曖昧な概念 → 具体的な医学カテゴリ（例: 「体にいい食べ物」→ "dietary patterns AND health outcomes"）
4. 研究デザイン（RCT, meta-analysis等）はクエリに**含めない**こと。検索結果は別のランキング工程でエビデンスレベル順にソートされるため、ここでは網羅性を優先する
5. 以下のJSON形式のみで応答すること。他のテキストは一切含めないこと

## 出力形式

{
  "original_query": "ユーザーの元のクエリ",
  "interpreted_intent": "ユーザーが知りたいことの解釈（英語）",
  "academic_queries": [
    "query 1 (高精度)",
    "query 2 (同義語展開)",
    "query 3 (PICO構造)"
  ],
  "mesh_terms": ["関連するMeSH用語1", "MeSH用語2"],
  "key_concepts": {
    "conditions": ["対象疾患・状態"],
    "interventions": ["介入・治療法"],
    "outcomes": ["アウトカム"]
  }
}"""

FALLBACK_RESULT = QueryTransformResult(
    original_query="",
    interpreted_intent="general health query",
    academic_queries=["systematic review", "meta-analysis", "randomized controlled trial"],
    mesh_terms=[],
    key_concepts={},
)


async def transform_query(user_query: str, language: str) -> QueryTransformResult:
    """Transform a natural language query into academic search queries."""
    user_query = _sanitize_query(user_query)
    if not user_query:
        logger.warning("Query empty after sanitization")
        fallback = FALLBACK_RESULT.model_copy()
        fallback.original_query = ""
        return fallback
    user_message = f"入力言語: {language}\n検索クエリ: {user_query}"

    try:
        data = await llm_chat_json(SYSTEM_PROMPT, user_message, retries=1)
        result = QueryTransformResult(**data)
        logger.info(
            "Query transformed: '%s' -> %d academic queries",
            user_query,
            len(result.academic_queries),
        )
        return result
    except Exception:
        logger.exception("Query transformation failed for: %s", user_query)
        fallback = FALLBACK_RESULT.model_copy()
        fallback.original_query = user_query
        fallback.academic_queries = [
            f"{user_query} systematic review",
            f"{user_query} meta-analysis",
            f"{user_query} randomized controlled trial",
        ]
        return fallback
