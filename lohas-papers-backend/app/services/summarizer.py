import asyncio
import logging

from app.services.llm_client import llm_chat

logger = logging.getLogger(__name__)

SUMMARY_SYSTEM_PROMPT = """あなたは医学論文の多言語要約エンジンです。

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

要約テキストのみを出力すること。JSON形式にはしないこと。余計な前置きや説明は一切含めないこと。"""

AI_SUMMARY_SYSTEM_PROMPT = """あなたは医学・科学情報を一般市民向けにわかりやすく解説するAIアシスタントです。

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
- ko: 한국어で回答"""

TITLE_TRANSLATION_SYSTEM_PROMPT = """あなたは学術論文タイトルの翻訳エンジンです。

## ルール
1. 論文タイトルを指定言語に翻訳すること
2. 専門用語は正確に翻訳し、一般的にわかりやすい表現を使うこと
3. 薬剤名は一般名を使用。例: tirzepatide → チルゼパチド(ja), 替尔泊肽(zh-Hans), 티르제파티드(ko)
4. 疾患名は現地語の一般的な呼称を使用
5. 英語の論文タイトルが入力された場合で、指定言語が英語の場合は、そのまま返すこと

## 出力形式
複数タイトルが入力される場合、各タイトルを1行ずつ出力すること。
入力の番号（1. 2. 3. ...）に対応する翻訳を同じ番号で出力すること。
番号と「. 」の後に翻訳タイトルのみを出力し、余計な説明は一切含めないこと。"""

LANGUAGE_NAMES = {
    "ja": "日本語",
    "en": "English",
    "zh-Hans": "简体中文",
    "ko": "한국어",
}


async def translate_titles_batch(titles: list[str], language: str) -> list[str]:
    """Translate multiple paper titles in a single LLM call."""
    if language == "en" or not titles:
        return titles
    lang_name = LANGUAGE_NAMES.get(language, language)
    numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(titles))
    user_message = f"言語: {lang_name} ({language})\n\n{numbered}"
    try:
        result = await llm_chat(TITLE_TRANSLATION_SYSTEM_PROMPT, user_message, max_tokens=2048)
        lines = [l.strip() for l in result.strip().split("\n") if l.strip()]
        translated: list[str] = []
        for line in lines:
            # Strip leading number like "1. " or "1."
            for sep in [". ", "．", "."]:
                idx = line.find(sep)
                if idx != -1 and line[:idx].strip().isdigit():
                    line = line[idx + len(sep):].strip()
                    break
            translated.append(line)
        # Ensure same length as input
        if len(translated) == len(titles):
            return translated
        # Fallback: return what we got, pad with originals
        return [translated[i] if i < len(translated) else titles[i] for i in range(len(titles))]
    except Exception:
        logger.exception("Batch title translation failed for language %s", language)
        return titles


async def generate_paper_summary(
    abstract: str,
    language: str,
    title: str = "",
) -> str:
    """Generate a summary for a single paper in the specified language."""
    lang_name = LANGUAGE_NAMES.get(language, language)
    user_message = f"言語: {lang_name} ({language})\n\n論文タイトル: {title}\n\nアブストラクト:\n{abstract}"

    try:
        return await llm_chat(SUMMARY_SYSTEM_PROMPT, user_message, max_tokens=1024)
    except Exception:
        logger.exception("Summary generation failed for language %s", language)
        return ""


async def generate_summaries_parallel(
    abstract: str,
    languages: list[str],
    title: str = "",
) -> dict[str, str]:
    """Generate summaries in multiple languages in parallel."""
    tasks = [
        generate_paper_summary(abstract, lang, title)
        for lang in languages
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    summaries: dict[str, str] = {}
    for lang, result in zip(languages, results):
        if isinstance(result, Exception):
            logger.warning("Summary generation failed for %s: %s", lang, result)
            summaries[lang] = ""
        else:
            summaries[lang] = result

    return summaries


async def generate_ai_overview(
    user_query: str,
    language: str,
    papers_context: str,
) -> str:
    """Generate an AI overview summary based on the search results."""
    lang_name = LANGUAGE_NAMES.get(language, language)
    user_message = (
        f"ユーザーの検索クエリ: {user_query}\n"
        f"回答言語: {lang_name} ({language})\n\n"
        f"関連論文情報:\n{papers_context}"
    )

    try:
        return await llm_chat(AI_SUMMARY_SYSTEM_PROMPT, user_message, max_tokens=1500)
    except Exception:
        logger.exception("AI overview generation failed")
        return ""
