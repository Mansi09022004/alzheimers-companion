"""Upload validation shared by face registration, identification, and voice."""

from app.core.exceptions import PermissionDeniedError

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
AUDIO_TYPES = {"audio/mp4", "audio/m4a", "audio/mpeg", "audio/wav", "audio/webm", "audio/aac"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_AUDIO_BYTES = 10 * 1024 * 1024


def validate_image(content_type: str | None, data: bytes) -> str:
    return _validate(content_type, data, IMAGE_TYPES, MAX_IMAGE_BYTES, "a JPEG, PNG or WebP image")


def validate_audio(content_type: str | None, data: bytes) -> str:
    return _validate(content_type, data, AUDIO_TYPES, MAX_AUDIO_BYTES, "an audio recording")


def _validate(content_type, data, allowed, max_bytes, label) -> str:
    if content_type not in allowed:
        raise PermissionDeniedError(f"Upload {label}.")
    if not data:
        raise PermissionDeniedError("The uploaded file is empty.")
    if len(data) > max_bytes:
        raise PermissionDeniedError("File is too large.")
    return content_type
