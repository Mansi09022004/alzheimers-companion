"""Rate limiting (slowapi). In-memory — fine for a single instance; a multi-instance
deploy would point `storage_uri` at Redis.

Applied to the endpoints that are cheap to abuse: login, registration, device pairing.
SOS is deliberately NOT limited — an emergency must always get through.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    enabled=get_settings().app_env != "test",
)
