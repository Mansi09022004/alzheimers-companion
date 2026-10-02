"""Profile + memory photo uploads (patient, people, memories).

Uploads go to Cloudinary when CLOUDINARY_URL is configured (production) so photos
survive redeploys — Render's free-tier local disk does not. Without it (plain local
dev), falls back to saving on local disk as before.

Not related to face recognition: those embeddings are stored separately and no photo
ever persists for them. This is a plain display picture, chosen by the caregiver.
"""

import uuid
from pathlib import Path

from app.core.config import get_settings
from app.services.media import validate_image

_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

_cloudinary_configured = False


def _upload_to_cloudinary(subfolder: str, entity_id: int, data: bytes) -> str:
    global _cloudinary_configured
    import cloudinary
    import cloudinary.uploader

    if not _cloudinary_configured:
        cloudinary.config(cloudinary_url=get_settings().cloudinary_url)
        _cloudinary_configured = True

    public_id = f"{subfolder}/{entity_id}_{uuid.uuid4().hex[:8]}"
    result = cloudinary.uploader.upload(data, public_id=public_id, overwrite=True)
    return result["secure_url"]


def _save_to_local_disk(subfolder: str, entity_id: int, content_type: str, data: bytes) -> str:
    settings = get_settings()
    ext = _EXT[content_type]  # validate_image already restricted content_type to this set
    filename = f"{entity_id}_{uuid.uuid4().hex[:8]}{ext}"

    directory = Path(settings.media_dir) / subfolder
    directory.mkdir(parents=True, exist_ok=True)
    (directory / filename).write_bytes(data)

    return f"{settings.media_url_prefix}/{subfolder}/{filename}"


def save_photo(subfolder: str, entity_id: int, content_type: str | None, data: bytes) -> str:
    """Validate + persist an uploaded image; return the URL to store on the record."""
    ctype = validate_image(content_type, data)
    if get_settings().cloudinary_url:
        return _upload_to_cloudinary(subfolder, entity_id, data)
    return _save_to_local_disk(subfolder, entity_id, ctype, data)
