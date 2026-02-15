import { llmChatJson, type LLMConfig } from "./llm-client";
import type { QueryTransformResult } from "./types";

// ── Query sanitization ──
const MAX_QUERY_LENGTH = 500;

function sanitizeQuery(query: string): string {
  // Truncate to max length
  let q = query.slice(0, MAX_QUERY_LENGTH);
  // Remove common prompt injection patterns
  q = q.replace(
    /(ignore\s+(previous|above|all)\s+instructions|you\s+are\s+now|system\s*:\s*|<\|.*?\|>|\{\{.*?\}\})/gi,
    "",
  );
  // Strip excessive whitespace
  q = q.replace(/\s+/g, " ").trim();
  return q;
}

const SYSTEM_PROMPT = `あなたは医学・科学分野の学術検索クエリ最適化エンジンです。

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
}`;

const FALLBACK_RESULT: QueryTransformResult = {
  original_query: "",
  interpreted_intent: "general health query",
  academic_queries: [
    "systematic review",
    "meta-analysis",
    "randomized controlled trial",
  ],
  mesh_terms: [],
  key_concepts: {},
};

export async function transformQuery(
  userQuery: string,
  language: string,
  config?: LLMConfig,
): Promise<QueryTransformResult> {
  const sanitized = sanitizeQuery(userQuery);
  if (!sanitized) {
    console.warn("Query empty after sanitization");
    return { ...FALLBACK_RESULT, original_query: "" };
  }

  const userMessage = `入力言語: ${language}\n検索クエリ: ${sanitized}`;

  try {
    const data = await llmChatJson(SYSTEM_PROMPT, userMessage, { retries: 1 }, config);
    const result: QueryTransformResult = {
      original_query: (data.original_query as string) || sanitized,
      interpreted_intent: (data.interpreted_intent as string) || "",
      academic_queries: (data.academic_queries as string[]) || [],
      mesh_terms: (data.mesh_terms as string[]) || [],
      key_concepts: (data.key_concepts as Record<string, string[]>) || {},
    };
    console.info(
      `Query transformed: '${sanitized}' -> ${result.academic_queries.length} academic queries`,
    );
    return result;
  } catch (err) {
    console.error(`Query transformation failed for: ${sanitized}`, err);
    return {
      ...FALLBACK_RESULT,
      original_query: sanitized,
      academic_queries: [
        `${sanitized} systematic review`,
        `${sanitized} meta-analysis`,
        `${sanitized} randomized controlled trial`,
      ],
    };
  }
}
