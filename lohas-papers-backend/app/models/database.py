from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


class PaperSummaryCache(Base):
    __tablename__ = "paper_summary_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    paper_id = Column(String(255), nullable=False, index=True)
    language = Column(String(10), nullable=False)
    summary = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        # Unique constraint: one summary per paper per language
        {"sqlite_autoincrement": True},
    )


class PaperMetadataCache(Base):
    __tablename__ = "paper_metadata_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    paper_id = Column(String(255), nullable=False, unique=True, index=True)
    title = Column(Text)
    authors = Column(Text)  # JSON string
    journal = Column(String(500))
    year = Column(Integer)
    doi = Column(String(255))
    abstract = Column(Text)
    citation_count = Column(Integer, default=0)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


_engine = None
_session_factory = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(settings.database_url, echo=False)
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(), class_=AsyncSession, expire_on_commit=False
        )
    return _session_factory


async def init_db():
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
