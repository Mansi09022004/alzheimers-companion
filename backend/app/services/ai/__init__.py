"""Provider factory. `get_llm_provider()` returns the configured implementation."""

from functools import lru_cache

from app.core.config import get_settings
from app.services.ai.base import LLMProvider


@lru_cache
def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    if settings.llm_provider == "fake":
        from app.services.ai.fake import FakeProvider

        return FakeProvider(embedding_dim=settings.embedding_dim)

    from app.services.ai.gemini import GeminiProvider

    return GeminiProvider()
