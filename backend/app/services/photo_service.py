"""Profile photo uploads (patient + people) — saved to local disk, served as static files.

Not related to face recognition: those embeddings are stored separately and no photo
ever persists for them. This is a plain display picture, chosen by the caregiver.
"""

import uuid
from pathlib import Path

from app.core.config import get_settings
from app.services.media import validate_image

_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def save_photo(subfolder: str, entity_id: int, content_type: str | None, data: bytes) -> str:
    """Validate + persist an uploaded image; return the URL path to store on the record."""
    validate_image(content_type, data)
    settings = get_settings()
    ext = _EXT[content_type]  # validate_image already restricted content_type to this set
    filename = f"{entity_id}_{uuid.uuid4().hex[:8]}{ext}"

    directory = Path(settings.media_dir) / subfolder
    directory.mkdir(parents=True, exist_ok=True)
    (directory / filename).write_bytes(data)

    return f"{settings.media_url_prefix}/{subfolder}/{filename}"
