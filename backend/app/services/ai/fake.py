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
        for token in set(text.split()):  # a token contributes once, regardless of count
            # spread each token across all dimensions using enough hash entropy that
            # unrelated tokens produce near-orthogonal contributions
            block = 0
            filled = 0
            while filled < self.embedding_dim:
                h = hashlib.sha512(f"{token}:{block}".encode()).digest()
                for b in h:
                    if filled >= self.embedding_dim:
                        break
                    vec[filled] += (b - 127.5) / 127.5
                    filled += 1
                block += 1
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def generate(self, system: str, prompt: str) -> str:
        return "[fake response] " + prompt[:200]

    def transcribe(self, audio: bytes, mime_type: str) -> str:
        return "tell me about rahul"
