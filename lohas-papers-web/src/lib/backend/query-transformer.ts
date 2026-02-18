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
    // Use dictionary-based fallback for Japanese queries
    const englishQuery = jaToEnFallback(sanitized);
    return {
      ...FALLBACK_RESULT,
      original_query: sanitized,
      academic_queries: [
        englishQuery,
        `${englishQuery} treatment`,
        `${englishQuery} systematic review`,
      ],
    };
  }
}

// ── Fallback Japanese-to-English medical dictionary ──
// Used when Claude API is unavailable (billing, rate limit, etc.)
const JA_EN_MEDICAL: Record<string, string> = {
  // Common diseases
  "双極性障害": "bipolar disorder",
  "うつ病": "depression",
  "うつ症状": "depressive symptoms",
  "統合失調症": "schizophrenia",
  "不安障害": "anxiety disorder",
  "パニック障害": "panic disorder",
  "強迫性障害": "obsessive-compulsive disorder",
  "PTSD": "PTSD",
  "自閉症": "autism spectrum disorder",
  "ADHD": "ADHD",
  "注意欠如多動症": "ADHD",
  "認知症": "dementia",
  "アルツハイマー": "Alzheimer disease",
  "てんかん": "epilepsy",
  "パーキンソン病": "Parkinson disease",
  "糖尿病": "diabetes mellitus",
  "高血圧": "hypertension",
  "脂質異常症": "dyslipidemia",
  "肥満": "obesity",
  "睡眠時無呼吸": "sleep apnea",
  "不眠症": "insomnia",
  "喘息": "asthma",
  "アレルギー": "allergy",
  "がん": "cancer",
  "白血病": "leukemia",
  "心筋梗塞": "myocardial infarction",
  "脳卒中": "stroke",
  "腎臓病": "kidney disease",
  "肝臓病": "liver disease",
  "関節リウマチ": "rheumatoid arthritis",
  "骨粗鬆症": "osteoporosis",
  "甲状腺": "thyroid",
  "貧血": "anemia",
  "花粉症": "hay fever",
  "インフルエンザ": "influenza",
  "新型コロナ": "COVID-19",
  "コロナ": "COVID-19",
  "ワクチン": "vaccine",
  "妊娠": "pregnancy",
  "出産": "childbirth",
  "小児": "pediatric",
  "新生児": "neonatal",
  // Symptoms
  "頭痛": "headache",
  "腰痛": "low back pain",
  "発熱": "fever",
  "疲労": "fatigue",
  "めまい": "dizziness",
  "吐き気": "nausea",
  "下痢": "diarrhea",
  "便秘": "constipation",
  "咳": "cough",
  "息切れ": "dyspnea",
  "動悸": "palpitation",
  "浮腫": "edema",
  "痛み": "pain",
  "炎症": "inflammation",
  // Treatment / general
  "治療": "treatment",
  "薬物療法": "pharmacotherapy",
  "手術": "surgery",
  "リハビリ": "rehabilitation",
  "予防": "prevention",
  "診断": "diagnosis",
  "予後": "prognosis",
  "副作用": "adverse effects",
  "エビデンス": "evidence",
  "ガイドライン": "clinical guidelines",
  "生活習慣": "lifestyle",
  "食事": "diet",
  "運動": "exercise",
  "睡眠": "sleep",
  "ストレス": "stress",
  "メンタルヘルス": "mental health",
  "リチウム": "lithium",
  "抗うつ薬": "antidepressants",
  "抗精神病薬": "antipsychotics",
  "気分安定薬": "mood stabilizers",
  "認知行動療法": "cognitive behavioral therapy",
  "CBT": "CBT",
  // Drug names
  "ゼップバウンド": "tirzepatide",
  "マンジャロ": "tirzepatide",
  "オゼンピック": "semaglutide",
  "リベルサス": "semaglutide",
  "エビリファイ": "aripiprazole",
  "ラミクタール": "lamotrigine",
  "デパケン": "valproate",
  "セロクエル": "quetiapine",
};

/**
 * Dictionary-based fallback: replace known Japanese medical terms with English equivalents.
 * Handles partial matches by sorting longer terms first.
 */
function jaToEnFallback(query: string): string {
  let result = query;
  // Sort by length (longest first) to avoid partial replacement issues
  const entries = Object.entries(JA_EN_MEDICAL).sort((a, b) => b[0].length - a[0].length);
  for (const [ja, en] of entries) {
    result = result.replace(new RegExp(ja, "g"), en);
  }
  // Remove any remaining Japanese characters (hiragana, katakana, kanji)
  result = result.replace(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]/g, " ");
  result = result.replace(/\s+/g, " ").trim();
  return result || query; // Return original if nothing translatable
}
