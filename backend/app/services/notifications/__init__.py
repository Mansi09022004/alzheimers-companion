"""Push-notification provider abstraction.

`get_push_provider()` returns the configured implementation. The rest of the app
depends on `PushProvider`, never on Expo directly, so it can be swapped.
"""

from functools import lru_cache
from typing import Protocol


class PushProvider(Protocol):
    def send(self, token: str, title: str, body: str, data: dict | None = None) -> None: ...


@lru_cache
def get_push_provider() -> PushProvider:
    from app.core.config import get_settings

    if get_settings().notification_provider == "expo":
        from app.services.notifications.expo import ExpoPushProvider

        return ExpoPushProvider()
    from app.services.notifications.log import LogPushProvider

    return LogPushProvider()
