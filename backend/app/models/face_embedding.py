"""A stored face embedding for a registered person.

We store the 512-number **vector**, never the enrolled photo. Similarity search
(pgvector) compares a new camera frame's embedding against these.
"""

from pgvector.sqlalchemy import Vector
from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import get_settings
from app.core.database import Base
from app.models.mixins import TimestampMixin

_DIM = get_settings().face_embedding_dim


class FaceEmbedding(TimestampMixin, Base):
    __tablename__ = "face_embeddings"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(
        ForeignKey("people.id", ondelete="CASCADE"), index=True, nullable=False
    )
    embedding: Mapped[list[float]] = mapped_column(Vector(_DIM), nullable=False)
    model_version: Mapped[str] = mapped_column(String(40), nullable=False)
    det_score: Mapped[float] = mapped_column(Float, nullable=False)
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
