"""No-op provider — logs instead of sending. Used in dev and tests."""

import logging

log = logging.getLogger("notifications")


class LogPushProvider:
    def send(self, token: str, title: str, body: str, data: dict | None = None) -> None:
        log.info("PUSH -> %s | %s: %s | data=%s", token[:12], title, body, data or {})
