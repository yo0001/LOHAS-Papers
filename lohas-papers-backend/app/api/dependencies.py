from app.config import Settings, get_settings


def get_current_settings() -> Settings:
    return get_settings()
