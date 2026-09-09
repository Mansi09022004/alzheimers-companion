"""Google Gemini provider (embeddings + chat).

Uses the `google-genai` SDK. `text-embedding-004` returns 768-d vectors.
Network / quota / missing-key problems are re-raised as `LLMError` so callers can
handle them uniformly.
"""

from app.core.config import get_settings
from app.services.ai.base import LLMError


class GeminiProvider:
    def __init__(self) -> None:
        s = get_settings()
        if not s.gemini_api_key:
            raise LLMError("GEMINI_API_KEY is not set.")
        from google import genai

        self._genai = genai
        self._client = genai.Client(api_key=s.gemini_api_key)
        self._embed_model = s.gemini_embed_model
        self._chat_model = s.gemini_chat_model
        self.embedding_dim = s.embedding_dim

    def embed(self, text: str) -> list[float]:
        if not text or not text.strip():
            raise LLMError("Cannot embed empty text.")
        try:
            resp = self._client.models.embed_content(
                model=self._embed_model,
                contents=text,
                config=self._genai.types.EmbedContentConfig(
                    output_dimensionality=self.embedding_dim,
                ),
            )
            values = list(resp.embeddings[0].values)
        except Exception as exc:  # noqa: BLE001 — normalise every SDK error
            raise LLMError(f"Gemini embedding failed: {exc}") from exc

        # gemini-embedding-001 only returns a unit-norm vector at its full size;
        # when we ask for fewer dimensions we must re-normalise ourselves so cosine
        # distance behaves.
        norm = sum(v * v for v in values) ** 0.5 or 1.0
        return [v / norm for v in values]

    def generate(self, system: str, prompt: str) -> str:
        try:
            resp = self._client.models.generate_content(
                model=self._chat_model,
                contents=prompt,
                config=self._genai.types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.3,
                    max_output_tokens=256,
                    # our prompts are simple grounded rephrasing — no reasoning needed,
                    # and on 2.5-flash "thinking" tokens would eat the output budget.
                    thinking_config=self._genai.types.ThinkingConfig(thinking_budget=0),
                ),
            )
        except Exception as exc:  # noqa: BLE001
            raise LLMError(f"Gemini generation failed: {exc}") from exc

        text = (getattr(resp, "text", None) or "").strip()
        if not text:
            reason = None
            if getattr(resp, "candidates", None):
                reason = getattr(resp.candidates[0], "finish_reason", None)
            raise LLMError(f"Gemini returned no text (finish_reason={reason}).")
        return text

    def transcribe(self, audio: bytes, mime_type: str) -> str:
        try:
            resp = self._client.models.generate_content(
                model=self._chat_model,
                contents=[
                    self._genai.types.Part.from_bytes(data=audio, mime_type=mime_type),
                    "Transcribe this audio to plain text. Return only the words spoken.",
                ],
                config=self._genai.types.GenerateContentConfig(temperature=0.0),
            )
        except Exception as exc:  # noqa: BLE001
            raise LLMError(f"Gemini transcription failed: {exc}") from exc
        text = (getattr(resp, "text", None) or "").strip()
        if not text:
            raise LLMError("Gemini returned no transcript.")
        return text
