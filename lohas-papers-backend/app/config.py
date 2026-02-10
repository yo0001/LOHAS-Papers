from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from functools import lru_cache

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

# Load .env with override=True so .env values take precedence
# over empty env vars (e.g. ANTHROPIC_API_KEY="" set by shell)
load_dotenv(_ENV_FILE, override=True)


class Settings(BaseSettings):
    # LLM
    anthropic_api_key: str = ""
    llm_model: str = "claude-sonnet-4-5-20250929"

    # Semantic Scholar
    semantic_scholar_api_key: str = ""

    # PubMed
    pubmed_api_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # PostgreSQL
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/lohas_papers"

    # App
    app_env: str = "development"
    daily_search_limit_free: int = 10
    daily_search_limit_premium: int = 100


@lru_cache
def get_settings() -> Settings:
    return Settings()
