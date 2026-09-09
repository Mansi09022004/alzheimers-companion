"""Deterministic offline provider — no network, no API key.

Used in tests and for local development without a Gemini key. Same text always maps
to the same vector, and similar strings land somewhat near each other (shared tokens
push shared dimensions), which is enough to exercise the RAG pipeline end to end.
"""

import hashlib
import math

from app.services.ai.base import LLMError


class FakeProvider:
    def __init__(self, embedding_dim: int = 768):
        self.embedding_dim = embedding_dim

    def embed(self, text: str) -> list[float]:
        text = (text or "").lower().strip()
        if not text:
            raise LLMError("Cannot embed empty text.")

        vec = [0.0] * self.embedding_dim
        for token in text.split():
            h = hashlib.sha256(token.encode()).digest()
            for i in range(self.embedding_dim):
                # each token nudges a deterministic set of dimensions
                vec[i] += (h[i % len(h)] - 128) / 128.0
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def generate(self, system: str, prompt: str) -> str:
        return "[fake response] " + prompt[:200]
