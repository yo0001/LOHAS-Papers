import { llmChat, type LLMConfig } from "./llm-client";

// ── Prompts ──

const SUMMARY_SYSTEM_PROMPT = `あなたは医学論文の多言語要約エンジンです。

論文のアブストラクトを受け取り、指定された言語で一般ユーザー向けのわかりやすい要約を生成してください。

## ルール

1. **対象読者は学術の素人である**。専門用語を使う場合は必ず平易な説明を併記すること
2. 具体的な数字を必ず含めること（「有意な効果があった」ではなく「平均22.5%の体重減少（80kgの人なら約18kg減）」のように）
3. 要約の長さは150〜250文字（日本語基準。他言語は同等の情報量）
4. 以下の構造で要約すること：
   - 何を調べた研究か（1文）
   - 主な結果（1-2文、具体的数字を含む）
   - 実用的な意味（1文、「つまり〜ということ」形式）
5. 医学用語の翻訳ルール：
   - 薬剤名: 一般名（商品名）の形式で表記。例：チルゼパチド（ゼップバウンド）
   - 疾患名: 現地語の一般的な呼称を使用。例：obesity → 肥満（ja）、비만（ko）、肥胖症（zh-Hans）
   - 統計用語: 数字で表現。p<0.001 → 「統計的に確実（偶然ではない確率99.9%以上）」
6. 指定言語が "en" の場合も、学術英語ではなく平易な英語で要約すること

## 出力形式

要約テキストのみを出力すること。JSON形式にはしないこと。余計な前置きや説明は一切含めないこと。`;

const AI_SUMMARY_SYSTEM_PROMPT = `あなたは医学・科学情報を一般市民向けにわかりやすく解説するAIアシスタントです。

ユーザーの検索クエリと関連する学術論文のリストを受け取り、それらの論文に基づいた総合的な回答を生成してください。

## ルール

1. 指定された言語で回答すること
2. 具体的なエビデンス（数字・研究結果）を引用すること
3. 専門用語には平易な説明を併記すること
4. 300〜500文字（日本語基準）で回答すること
5. 末尾に「※この情報は医療アドバイスではありません。健康上の判断は必ず医師にご相談ください。」を付記すること
6. 回答テキストのみを出力すること。JSON形式にはしないこと。

## 言語コードと対応
- ja: 日本語で回答
- en: 平易な英語で回答
- zh-Hans: 简体中文で回答
- ko: 한국어で回答
- es: Español（スペイン語）で回答
- pt-BR: Português do Brasil（ブラジルポルトガル語）で回答
- th: ภาษาไทย（タイ語）で回答
- vi: Tiếng Việt（ベトナム語）で回答`;

const TITLE_TRANSLATION_SYSTEM_PROMPT = `あなたは学術論文タイトルの翻訳エンジンです。

## ルール
1. 論文タイトルを指定言語に翻訳すること
2. 専門用語は正確に翻訳し、一般的にわかりやすい表現を使うこと
3. 薬剤名は一般名を使用。例: tirzepatide → チルゼパチド(ja), 替尔泊肽(zh-Hans), 티르제파티드(ko)
4. 疾患名は現地語の一般的な呼称を使用
5. 英語の論文タイトルが入力された場合で、指定言語が英語の場合は、そのまま返すこと

## 出力形式
複数タイトルが入力される場合、各タイトルを1行ずつ出力すること。
入力の番号（1. 2. 3. ...）に対応する翻訳を同じ番号で出力すること。
番号と「. 」の後に翻訳タイトルのみを出力し、余計な説明は一切含めないこと。`;

const EXPERT_TRANSLATION_PROMPT = `あなたは医学・科学論文の専門翻訳者です。

論文のアブストラクトを指定された言語に忠実に翻訳してください。

## ルール

1. **原文の意味を正確に保持すること**。情報の追加・省略は不可
2. 専門用語はそのまま正確に翻訳すること（平易化しない）
3. 統計値・数値はそのまま保持（p値、信頼区間、効果量など）
4. 学術論文にふさわしい格調の文体を使用すること
5. 薬剤名: 一般名で表記（例: semaglutide → セマグルチド(ja)、司美格鲁肽(zh-Hans)、세마글루타이드(ko)）
6. 指定言語が英語の場合は、原文のアブストラクトをそのまま返すこと

## 出力形式

翻訳テキストのみを出力すること。余計な前置きや説明は一切含めないこと。`;

const LAYPERSON_TRANSLATION_PROMPT = `あなたは医学論文を一般の人向けにわかりやすく翻訳するエキスパートです。

論文のアブストラクトを指定された言語で、専門知識がない人でも理解できるように翻訳してください。

## ルール

1. **専門用語は必ず平易な説明を括弧で併記すること**
   例: 「有意なHbA1c低下（血糖コントロールの指標が改善）」
   例: 「プラセボ群（偽薬を投与されたグループ）」
2. 統計値は具体的な意味に変換すること
   例: p<0.001 → 「統計的に確実な差（偶然の確率0.1%未満）」
   例: HR 0.7 → 「リスクが約30%低下」
3. 数字は身近な例えを添えること
   例: 「平均5.9kgの体重減少（60kgの人なら約6kg減）」
4. 文章は短く、一文一義で書くこと
5. 情報の正確さは保ちつつ、高校生が読んで理解できるレベルにすること
6. 指定言語が英語の場合も、学術英語ではなく平易な英語にすること

## 出力形式

翻訳テキストのみを出力すること。余計な前置きや説明は一切含めないこと。`;

const CHILDREN_TRANSLATION_PROMPT = `あなたは難しい科学の話を子供にもわかるように説明する先生です。

論文のアブストラクトの内容を、10歳の子供でも理解できるようにやさしい言葉で説明してください。

## ルール

1. **難しい言葉は使わない**。どうしても必要な場合は「〜というもの」と説明する
2. 身近なたとえを積極的に使うこと
   例: 「体の中の『おそうじ細胞』がうまく働かなくなる病気」
   例: 「この薬は、おなかにいる『もうおなかいっぱい』と伝えるメッセンジャーの真似をします」
3. 結果は具体的にわかりやすく
   例: 「この薬を飲んだ人は、飲まなかった人よりも体重が約6キロ減りました」
4. 短い文で書くこと。一文は40文字（日本語基準）以内
5. 「〜だよ」「〜なんだ」のようなやさしい口調を使うこと（日本語の場合）
6. 怖い表現は避け、ポジティブな伝え方を心がけること
7. 英語の場合は simple English を使い、friendly tone で書くこと
8. 中国語・韓国語の場合もそれぞれの言語でやさしい口調にすること
9. スペイン語・ポルトガル語の場合はtono informal（tú/você形式）でやさしく書くこと
10. タイ語の場合はครับ/ค่ะを使いやさしい口調にすること
11. ベトナム語の場合は親しみやすい口調で書くこと

## 出力形式

翻訳テキストのみを出力すること。余計な前置きや説明は一切含めないこと。`;

const FULLTEXT_SECTION_PROMPT = `あなたは学術論文の翻訳者です。

論文の1セクションを指定された言語に翻訳してください。
翻訳の難易度は別途指定されるプロンプトに従ってください。

## ルール
1. セクションのテキストを忠実に翻訳すること
2. 図表の参照（Figure 1, Table 2等）はそのまま保持すること
3. 数式・化学式はそのまま保持すること
4. 参考文献の引用番号（[1], [2]等）はそのまま保持すること
5. 翻訳テキストのみを出力すること。余計な前置きや説明は一切含めないこと`;

const LANGUAGE_NAMES: Record<string, string> = {
  ja: "日本語",
  en: "English",
  "zh-Hans": "简体中文",
  ko: "한국어",
  es: "Español",
  "pt-BR": "Português (Brasil)",
  th: "ภาษาไทย",
  vi: "Tiếng Việt",
};

const DIFFICULTY_PROMPTS: Record<string, string> = {
  expert: EXPERT_TRANSLATION_PROMPT,
  layperson: LAYPERSON_TRANSLATION_PROMPT,
  children: CHILDREN_TRANSLATION_PROMPT,
};

// ── Public API ──

export async function translateTitlesBatch(
  titles: string[],
  language: string,
  config?: LLMConfig,
): Promise<string[]> {
  if (language === "en" || titles.length === 0) return titles;

  const langName = LANGUAGE_NAMES[language] ?? language;
  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const userMessage = `言語: ${langName} (${language})\n\n${numbered}`;

  try {
    const result = await llmChat(TITLE_TRANSLATION_SYSTEM_PROMPT, userMessage, {
      maxTokens: 2048,
    }, config);
    const lines = result
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const translated: string[] = [];
    for (let line of lines) {
      // Strip leading number like "1. " or "1."
      for (const sep of [". ", "．", "."]) {
        const idx = line.indexOf(sep);
        if (idx !== -1 && /^\d+$/.test(line.slice(0, idx).trim())) {
          line = line.slice(idx + sep.length).trim();
          break;
        }
      }
      translated.push(line);
    }

    // Ensure same length as input
    if (translated.length === titles.length) return translated;
    // Fallback: return what we got, pad with originals
    return titles.map((t, i) => (i < translated.length ? translated[i] : t));
  } catch (err) {
    console.error(`Batch title translation failed for language ${language}`, err);
    return titles;
  }
}

export async function generatePaperSummary(
  abstract: string,
  language: string,
  title: string = "",
  config?: LLMConfig,
): Promise<string> {
  const langName = LANGUAGE_NAMES[language] ?? language;
  const userMessage = `言語: ${langName} (${language})\n\n論文タイトル: ${title}\n\nアブストラクト:\n${abstract}`;

  try {
    return await llmChat(SUMMARY_SYSTEM_PROMPT, userMessage, { maxTokens: 1024 }, config);
  } catch (err) {
    console.error(`Summary generation failed for language ${language}`, err);
    return "";
  }
}

export async function generateAiOverview(
  userQuery: string,
  language: string,
  papersContext: string,
  config?: LLMConfig,
): Promise<string> {
  const langName = LANGUAGE_NAMES[language] ?? language;
  const userMessage =
    `ユーザーの検索クエリ: ${userQuery}\n` +
    `回答言語: ${langName} (${language})\n\n` +
    `関連論文情報:\n${papersContext}`;

  try {
    return await llmChat(AI_SUMMARY_SYSTEM_PROMPT, userMessage, {
      maxTokens: 1500,
    }, config);
  } catch (err) {
    console.error("AI overview generation failed", err);
    return "";
  }
}

// ── Abstract Translation (3 difficulty levels) ──

export async function translateAbstract(
  abstract: string,
  language: string,
  difficulty: string,
  title: string = "",
  config?: LLMConfig,
): Promise<string> {
  const prompt = DIFFICULTY_PROMPTS[difficulty] ?? LAYPERSON_TRANSLATION_PROMPT;
  const langName = LANGUAGE_NAMES[language] ?? language;

  const userMessage =
    `言語: ${langName} (${language})\n` +
    `論文タイトル: ${title}\n\n` +
    `アブストラクト:\n${abstract}`;

  try {
    return await llmChat(prompt, userMessage, { maxTokens: 2048 }, config);
  } catch (err) {
    console.error(
      `Abstract translation failed (difficulty=${difficulty}, lang=${language})`,
      err,
    );
    return "";
  }
}

export async function translateAbstractAllLevels(
  abstract: string,
  language: string,
  title: string = "",
  config?: LLMConfig,
): Promise<Record<string, string>> {
  const difficulties = ["expert", "layperson", "children"];
  const tasks = difficulties.map((d) =>
    translateAbstract(abstract, language, d, title, config),
  );
  const results = await Promise.allSettled(tasks);

  const translations: Record<string, string> = {};
  for (let i = 0; i < difficulties.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      translations[difficulties[i]] = result.value;
    } else {
      console.warn(
        `Translation failed for ${difficulties[i]}:`,
        result.reason,
      );
      translations[difficulties[i]] = "";
    }
  }

  return translations;
}

// ── Fulltext Translation ──

export async function translateFulltextSection(
  text: string,
  language: string,
  difficulty: string,
  sectionName: string = "",
  config?: LLMConfig,
): Promise<string> {
  const difficultyPrompt =
    DIFFICULTY_PROMPTS[difficulty] ?? LAYPERSON_TRANSLATION_PROMPT;
  const langName = LANGUAGE_NAMES[language] ?? language;

  // Combine section-specific prompt with difficulty prompt
  const systemPrompt = `${difficultyPrompt}\n\n${FULLTEXT_SECTION_PROMPT}`;

  const userMessage =
    `言語: ${langName} (${language})\n` +
    `セクション: ${sectionName}\n\n` +
    text;

  try {
    return await llmChat(systemPrompt, userMessage, { maxTokens: 8192 }, config);
  } catch (err) {
    console.error(
      `Fulltext section translation failed (section=${sectionName}, difficulty=${difficulty}, lang=${language})`,
      err,
    );
    return "";
  }
}

export async function translateFulltextSections(
  sections: Array<{ name: string; text: string }>,
  language: string,
  difficulty: string,
  config?: LLMConfig,
): Promise<Array<{ section_name: string; original: string; translated: string }>> {
  const tasks = sections.map((s) =>
    translateFulltextSection(s.text, language, difficulty, s.name, config),
  );
  const results = await Promise.allSettled(tasks);

  return sections.map((section, i) => {
    const result = results[i];
    const translatedText =
      result.status === "fulfilled" ? result.value : "";
    if (result.status === "rejected") {
      console.warn(
        `Section translation failed for ${section.name}:`,
        result.reason,
      );
    }
    return {
      section_name: section.name,
      original: section.text,
      translated: translatedText,
    };
  });
}
