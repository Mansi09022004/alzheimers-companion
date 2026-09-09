"""Alembic migration environment.

Responsibilities:
- pull the database URL from our app Settings (never from alembic.ini),
- point Alembic at `Base.metadata` so `alembic revision --autogenerate` can diff
  our ORM models against the real database,
- import every model module so their tables are registered on `Base.metadata`.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.core.database import Base
from app import models  # noqa: F401  (registers every table on Base.metadata)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", get_settings().database_url)

target_metadata = Base.metadata


def include_object(obj, name, type_, reflected, compare_to):
    """Ignore objects that live only in raw SQL (not in the ORM metadata), so
    autogenerate doesn't keep proposing to drop them.

    - the pgvector HNSW index on face_embeddings is created via op.execute().
    """
    if type_ == "index" and name == "ix_face_embeddings_hnsw":
        return False
    return True


def run_migrations_offline() -> None:
    """Emit SQL to stdout without a live DB connection (`alembic upgrade --sql`)."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live database connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
