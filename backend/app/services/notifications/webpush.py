"""Browser Web Push — the caregiver's dashboard doesn't need to be open for a
critical alert (SOS, above all) to reach them.

Generate a VAPID keypair once:

    python -c "from py_vapid import Vapid02; v=Vapid02(); v.generate_keys(); v.save_key('vapid_private_key.pem')"

then print the public key for `VAPID_PUBLIC_KEY` (the dashboard needs it too, to
subscribe):

    python -c "
    from py_vapid import Vapid02
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
    import base64
    v = Vapid02.from_file('vapid_private_key.pem')
    raw = v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    print(base64.urlsafe_b64encode(raw).decode().rstrip('='))
    "
"""

import json
import logging

from pywebpush import WebPushException, webpush

from app.core.config import get_settings
from app.models.push_subscription import PushSubscription

log = logging.getLogger("notifications")


def send_to_subscription(sub: PushSubscription, title: str, body: str, data: dict | None = None) -> bool:
    """Returns False (and the caller should delete the subscription) when the
    browser says it's gone — the user revoked permission or uninstalled/expired it."""
    settings = get_settings()
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps({"title": title, "body": body, "data": data or {}}),
            vapid_private_key=settings.vapid_private_key_path,
            vapid_claims={"sub": settings.vapid_subject},
            ttl=60,
        )
        return True
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None)
        if status in (404, 410):
            return False
        log.warning("web push failed (%s): %s", status, exc)
        return True  # transient — keep the subscription, don't punish it for one failure
