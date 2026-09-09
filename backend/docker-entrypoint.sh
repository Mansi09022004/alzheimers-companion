#!/bin/sh
set -e

# Apply migrations before the app accepts traffic.
echo "running migrations…"
alembic upgrade head

exec "$@"
