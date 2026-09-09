"""LLM provider interface.

The rest of the app depends on THIS, never on `google.genai` directly, so the
provider can be swapped (Gemini today, OpenAI/local tomorrow) by changing one env var.
"""

from typing import Protocol, runtime_checkable


@runtime_checkable
class LLMProvider(Protocol):
    embedding_dim: int

    def embed(self, text: str) -> list[float]:
        """Return an embedding vector for a single piece of text."""
        ...

    def generate(self, system: str, prompt: str) -> str:
        """Return a text completion. Used by the RAG assistant (Phase 8)."""
        ...


class LLMError(Exception):
    """Raised when the provider cannot fulfil a request (network, quota, no key)."""
