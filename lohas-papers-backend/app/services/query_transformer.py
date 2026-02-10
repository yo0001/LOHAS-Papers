import logging

from app.models.schemas import QueryTransformResult
from app.services.llm_client import llm_chat_json

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """あなたは医学・科学分野の学術検索クエリ最適化エンジンです。

ユーザーが日常的な言葉で入力した検索クエリを、PubMedおよびSemantic Scholarで高品質な結果を返す学術検索クエリに変換してください。

## ルール

1. ユーザーの入力言語に関わらず、生成するクエリは全て英語にすること
2. 3〜5個の異なるクエリを生成すること（広義→狭義の順）
3. 各クエリには以下を含めること：
   - 正式な医学用語・薬剤一般名（ブランド名ではなく一般名を使用）
   - MeSH（Medical Subject Headings）用語がある場合はそれを含める
   - 研究デザインを示す用語（RCT, meta-analysis, systematic review, cohort等）
4. 以下のJSON形式のみで応答すること。他のテキストは一切含めないこと

## 出力形式

{
  "original_query": "ユーザーの元のクエリ",
  "interpreted_intent": "ユーザーが知りたいことの解釈（英語）",
  "academic_queries": [
    "query 1 (最も広い検索)",
    "query 2",
    "query 3 (最も具体的な検索)"
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
