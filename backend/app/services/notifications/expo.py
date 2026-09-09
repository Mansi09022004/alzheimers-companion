"""Expo Push provider.

One HTTP call to Expo's push service; Expo forwards to FCM (Android) and APNs (iOS),
so we implement a single integration. Failures are logged, not raised — a missed
notification must never break the request that triggered it.
"""

import logging

import httpx

from app.core.config import get_settings

log = logging.getLogger("notifications")
_ENDPOINT = "https://exp.host/--/api/v2/push/send"


class ExpoPushProvider:
    def send(self, token: str, title: str, body: str, data: dict | None = None) -> None:
        if not token.startswith("ExponentPushToken"):
            log.warning("skipping push: not an Expo token (%s)", token[:16])
            return
        headers = {"Content-Type": "application/json"}
        access = get_settings().expo_access_token
        if access:
            headers["Authorization"] = f"Bearer {access}"
        payload = {"to": token, "title": title, "body": body, "sound": "default", "data": data or {}}
        try:
            resp = httpx.post(_ENDPOINT, json=payload, headers=headers, timeout=10.0)
            if resp.status_code >= 400:
                log.warning("expo push failed %s: %s", resp.status_code, resp.text[:200])
        except httpx.HTTPError as exc:
            log.warning("expo push error: %s", exc)
