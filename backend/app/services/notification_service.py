"""High-level notification dispatch.

- `notify_patient_device` — push to one paired device (medication reminders, memory moments)
- `notify_caregivers` — an alert fired; caregivers currently read the alerts feed on the
  web dashboard, so this logs. A caregiver mobile app / email would hook in here.
"""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.patient_device import PatientDevice
from app.services.notifications import get_push_provider

log = logging.getLogger("notifications")


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


def notify_caregivers(alert: Alert) -> None:
    """Caregivers see alerts in the dashboard feed. This is the hook for real
    delivery (caregiver app push / SMS / email) — logged for now."""
    log.info(
        "ALERT for patient %s [%s/%s]: %s",
        alert.patient_id,
        alert.type.value,
        alert.severity.value,
        alert.reason_text,
    )
