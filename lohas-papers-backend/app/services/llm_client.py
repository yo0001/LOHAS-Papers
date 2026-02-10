import json
import logging

import anthropic

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: anthropic.AsyncAnthropic | None = None


def get_llm_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        settings = get_settings()
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def llm_chat(
    system_prompt: str,
    user_message: str,
    *,
    expect_json: bool = False,
    max_tokens: int = 2048,
) -> str:
    """Send a message to the LLM and return the text response."""
    settings = get_settings()
    client = get_llm_client()

    response = await client.messages.create(
        model=settings.llm_model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    text = response.content[0].text.strip()

    if expect_json:
        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.startswith("```")]
            text = "\n".join(lines).strip()

    return text


async def llm_chat_json(
    system_prompt: str,
    user_message: str,
    *,
    max_tokens: int = 2048,
    retries: int = 1,
) -> dict:
    """Send a message and parse the JSON response, with retry on parse failure."""
    for attempt in range(retries + 1):
        text = await llm_chat(
            system_prompt,
            user_message,
            expect_json=True,
            max_tokens=max_tokens,
        )
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning(
                "JSON parse failed (attempt %d/%d): %s",
                attempt + 1,
                retries + 1,
                text[:200],
            )
            if attempt == retries:
                raise
    # unreachable
    raise RuntimeError("LLM JSON parse failed after retries")
