import { llmChatJson } from "./llm-client";
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

export async function rankPapers(
  userQuery: string,
  interpretedIntent: string,
  papers: UnifiedPaper[],
): Promise<RankedPaper[]> {
  if (papers.length === 0) return [];

  // Pre-filter: take top 20 using hybrid score (citations + recency)
  const currentYear = new Date().getFullYear();
  const maxCitations = Math.max(...papers.map((p) => p.citation_count), 1);

  function hybridScore(p: UnifiedPaper): number {
    const citationScore = p.citation_count / maxCitations; // 0-1
    const recency = Math.max(0, 1 - (currentYear - (p.year ?? 2000)) / 20); // 0-1
    return citationScore * 0.6 + recency * 0.4;
  }

  const sortedByHybrid = [...papers].sort(
    (a, b) => hybridScore(b) - hybridScore(a),
  );
  const candidates = sortedByHybrid.slice(0, 20);

  // Build compact paper list for LLM (minimize tokens for speed)
  let paperListText = "";
  for (const p of candidates) {
    const abstractPreview = (p.abstract ?? "").slice(0, 100);
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
    const data = await llmChatJson(SYSTEM_PROMPT, userMessage, {
      maxTokens: 4096,
      retries: 1,
    });
    const rankings = (data.rankings ?? []) as RankedPaper[];
    return rankings;
  } catch (err) {
    console.error("Relevance ranking failed, using citation-based fallback", err);
    return fallbackRanking(candidates);
  }
}

function fallbackRanking(papers: UnifiedPaper[]): RankedPaper[] {
  const maxCitations = Math.max(...papers.map((p) => p.citation_count), 1);

  return papers.map((paper) => ({
    paper_id: paper.id,
    relevance_score: Math.round((paper.citation_count / maxCitations) * 100) / 100,
    evidence_level: "moderate",
    study_type: "other",
    reason: "Ranked by citation count (LLM fallback)",
  }));
}
