"""High-level notification dispatch.

- `notify_patient_device` — push to one paired device (medication reminders, memory moments)
- `notify_caregivers` — an alert fired (SOS, above all): browser Web Push to every
  caregiver who has enabled it, so it reaches them even with the dashboard closed.
  Always also logged, and the alert itself is in the dashboard's feed regardless.
"""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.patient_caregiver import PatientCaregiver
from app.models.patient_device import PatientDevice
from app.repositories import push_subscription_repo
from app.services.notifications import get_push_provider
from app.services.notifications.webpush import send_to_subscription

log = logging.getLogger("notifications")

_ALERT_TITLE = {
    "sos": "🆘 Emergency — help needed",
}


def notify_patient_device(device: PatientDevice, title: str, body: str, data: dict | None = None) -> None:
    if not device.expo_push_token or device.revoked:
        return
    get_push_provider().send(device.expo_push_token, title, body, data)


def notify_patient(db: Session, patient_id: int, title: str, body: str, data: dict | None = None) -> None:
    devices = db.execute(
        select(PatientDevice).where(
            PatientDevice.patient_id == patient_id,
            PatientDevice.revoked.is_(False),
            PatientDevice.expo_push_token.isnot(None),
        )
    ).scalars()
    for device in devices:
        notify_patient_device(device, title, body, data)


def notify_caregivers(db: Session, alert: Alert) -> None:
    """Caregivers always see the alert in the dashboard feed. This also pushes a
    browser notification to any caregiver who has enabled Web Push, so a critical
    alert (SOS, above all) reaches them without the dashboard tab open."""
    log.info(
        "ALERT for patient %s [%s/%s]: %s",
        alert.patient_id,
        alert.type.value,
        alert.severity.value,
        alert.reason_text,
    )

    caregiver_ids = list(
        db.execute(
            select(PatientCaregiver.caregiver_id).where(PatientCaregiver.patient_id == alert.patient_id)
        ).scalars()
    )
    subs = push_subscription_repo.list_for_caregivers(db, caregiver_ids)
    if not subs:
        return

    title = _ALERT_TITLE.get(alert.type.value, "Alzheimer's Companion alert")
    for sub in subs:
        alive = send_to_subscription(sub, title, alert.reason_text, {"patient_id": alert.patient_id, "alert_id": alert.id})
        if not alive:
            db.delete(sub)
