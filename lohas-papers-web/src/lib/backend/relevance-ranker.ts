import { llmChatJson, type LLMConfig } from "./llm-client";
import type { RankedPaper, UnifiedPaper } from "./types";

const SYSTEM_PROMPT = `あなたは学術論文の関連度評価エンジンです。

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
study_typeは "meta-analysis", "systematic-review", "RCT", "cohort", "case-series", "case-report", "basic-research", "review", "other" のいずれか。`;

const WORD_RE = /[a-z0-9][a-z0-9-]{1,}/g;
const STOPWORDS = new Set([
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
]);
const RANKING_LLM_TIMEOUT_MS = 6_000;

function tokenize(text: string): Set<string> {
  const tokens = (text.toLowerCase().match(WORD_RE) ?? []).filter(
    (t) => !STOPWORDS.has(t) && t.length >= 3,
  );
  return new Set(tokens);
}

function lexicalScore(queryTerms: Set<string>, paper: UnifiedPaper): number {
  if (queryTerms.size === 0) return 0;

  const title = (paper.title ?? "").toLowerCase();
  const abstract = (paper.abstract ?? "").slice(0, 1200).toLowerCase();
  const docTerms = tokenize(`${title} ${abstract}`);
  if (docTerms.size === 0) return 0;

  let overlap = 0;
  for (const t of queryTerms) {
    if (docTerms.has(t)) overlap += 1;
  }

  const ratio = overlap / Math.max(1, queryTerms.size);
  const phraseBoost = [...queryTerms].some((t) => title.includes(t)) ? 0.2 : 0.0;
  return Math.min(1, ratio + phraseBoost);
}

function inferStudyType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("meta-analysis") || t.includes("meta analysis")) return "meta-analysis";
  if (t.includes("systematic review")) return "systematic-review";
  if (t.includes("randomized") || t.includes("randomised") || t.includes(" rct")) return "RCT";
  if (t.includes("cohort")) return "cohort";
  if (t.includes("case series")) return "case-series";
  if (t.includes("case report")) return "case-report";
  if (t.includes("in vitro") || t.includes("mouse") || t.includes("mice") || t.includes("mechanism")) {
    return "basic-research";
  }
  if (t.includes("review")) return "review";
  return "other";
}

function evidenceLevel(studyType: string): "high" | "moderate" | "low" {
  if (["meta-analysis", "systematic-review", "RCT"].includes(studyType)) return "high";
  if (["cohort", "review"].includes(studyType)) return "moderate";
  return "low";
}

export async function rankPapers(
  userQuery: string,
  interpretedIntent: string,
  papers: UnifiedPaper[],
  config?: LLMConfig,
): Promise<RankedPaper[]> {
  if (papers.length === 0) return [];

  const currentYear = new Date().getFullYear();
  const maxCitations = Math.max(...papers.map((p) => p.citation_count), 1);
  const queryTerms = tokenize(`${userQuery} ${interpretedIntent}`);

  function prefilterScore(p: UnifiedPaper): number {
    const citationScore = p.citation_count / maxCitations;
    const recency = Math.max(0, 1 - (currentYear - (p.year ?? 2000)) / 20);
    const lexical = lexicalScore(queryTerms, p);
    return lexical * 0.55 + citationScore * 0.25 + recency * 0.2;
  }

  // Wider candidate set (20 -> 40)
  const candidates = [...papers].sort((a, b) => prefilterScore(b) - prefilterScore(a)).slice(0, 40);

  // Less lossy preview (100 -> 400 chars)
  let paperListText = "";
  for (const p of candidates) {
    const abstractPreview = (p.abstract ?? "").slice(0, 400);
    paperListText +=
      `- ID: ${p.id} | ${p.year ?? "?"} | cite:${p.citation_count}\n` +
      `  ${p.title}\n` +
      `  ${abstractPreview}\n`;
  }

  const userMessage =
    `ユーザーの検索クエリ: ${userQuery}\n` +
    `検索意図: ${interpretedIntent}\n\n` +
    `論文リスト:\n${paperListText}`;

  try {
    const data = await withTimeout(
      llmChatJson(SYSTEM_PROMPT, userMessage, {
        maxTokens: 4096,
        retries: 1,
      }, config),
      RANKING_LLM_TIMEOUT_MS,
    );
    const rankings = (data.rankings ?? []) as RankedPaper[];
    return rankings;
  } catch (err) {
    console.error("Relevance ranking failed, using hybrid fallback", err);
    return fallbackRanking(candidates, userQuery, interpretedIntent);
  }
}

function fallbackRanking(
  papers: UnifiedPaper[],
  userQuery: string,
  interpretedIntent: string,
): RankedPaper[] {
  const currentYear = new Date().getFullYear();
  const maxCitations = Math.max(...papers.map((p) => p.citation_count), 1);
  const queryTerms = tokenize(`${userQuery} ${interpretedIntent}`);

  const rankings = papers.map((paper) => {
    const lexical = lexicalScore(queryTerms, paper);
    const citationScore = paper.citation_count / maxCitations;
    const recency = Math.max(0, 1 - (currentYear - (paper.year ?? 2000)) / 20);
    const score = Math.round((lexical * 0.6 + citationScore * 0.25 + recency * 0.15) * 1000) / 1000;

    const inferred = inferStudyType(`${paper.title}\n${paper.abstract ?? ""}`);

    return {
      paper_id: paper.id,
      relevance_score: score,
      evidence_level: evidenceLevel(inferred),
      study_type: inferred,
      reason: "Fallback rank by lexical match + citations + recency",
    } satisfies RankedPaper;
  });

  rankings.sort((a, b) => b.relevance_score - a.relevance_score);
  return rankings;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
