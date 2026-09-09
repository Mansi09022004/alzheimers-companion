"""Caregiver alerts: create (from geofence / SOS / medication), list, acknowledge."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.alert import Alert, AlertSeverity, AlertType
from app.models.user import User
from app.repositories import alert_repo
from app.services.access import require_patient_access


def raise_alert(
    db: Session,
    *,
    patient_id: int,
    type_: AlertType,
    severity: AlertSeverity,
    reason_text: str,
    context: dict,
) -> Alert:
    """Create an alert and notify caregivers. Caller owns the transaction/commit."""
    alert = alert_repo.create(
        db,
        patient_id=patient_id,
        type=type_,
        severity=severity,
        reason_text=reason_text,
        context=context,
    )
    try:
        from app.services import notification_service

        notification_service.notify_caregivers(alert)
    except Exception:  # noqa: BLE001 — notification failure must not block the alert
        pass
    return alert


def list_alerts(
    db: Session, patient_id: int, user: User, *, unacknowledged_only: bool, limit: int
) -> list[Alert]:
    require_patient_access(db, patient_id, user)
    return alert_repo.list_for_patient(
        db, patient_id, unacknowledged_only=unacknowledged_only, limit=max(1, min(limit, 200))
    )


def acknowledge(db: Session, alert_id: int, user: User) -> Alert:
    alert = alert_repo.get(db, alert_id)
    if alert is None:
        raise NotFoundError("Alert not found.")
    require_patient_access(db, alert.patient_id, user)
    if alert.acknowledged_at is None:
        alert.acknowledged_by = user.id
        alert.acknowledged_at = datetime.now(UTC)
        db.commit()
        db.refresh(alert)
    return alert
