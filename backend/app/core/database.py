"""Database engine, session factory, and the declarative Base for ORM models.

- `engine`  : the connection pool to PostgreSQL.
- `SessionLocal` : a factory that hands out short-lived Session objects (one per request).
- `Base`    : every ORM model class inherits from this; Alembic uses its `.metadata`
              to know what tables should exist.
- `get_db`  : a FastAPI dependency that opens a session, yields it to the route,
              and always closes it afterwards.
"""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # check a connection is alive before using it (avoids stale-connection errors)
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Iterator[Session]:
    """Yield a database session and guarantee it is closed.

    Used as `db: Session = Depends(get_db)` in route handlers.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
