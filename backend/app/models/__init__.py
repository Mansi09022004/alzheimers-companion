"""Import every model here so Alembic autogenerate and `Base.metadata` see them."""

from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole

__all__ = ["User", "UserRole", "RefreshToken"]
