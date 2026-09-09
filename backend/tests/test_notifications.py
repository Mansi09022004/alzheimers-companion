"""Push-token registration, caregiver-alert hook, and the medication-reminder job."""

from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

pytestmark = pytest.mark.usefixtures("clean_db")


class SpyPush:
    def __init__(self):
        self.sent: list[tuple[str, str, str]] = []

    def send(self, token, title, body, data=None):
        self.sent.append((token, title, body))


@pytest.fixture
def paired(client, caregiver):
    h, _ = caregiver
    pid = client.post(
        "/api/v1/patients",
        json={"full_name": "Kamala", "timezone": "Asia/Kolkata"},
        headers=h,
    ).json()["id"]
    client.post(
        f"/api/v1/patients/{pid}/medications",
        json={"name": "Donepezil", "schedule_times": ["08:00"]},
        headers=h,
    )
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "p"}, headers=h).json()["pairing_code"]
    tok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    return {"h": h, "pid": pid, "ph": {"Authorization": f"Bearer {tok}"}}


def test_register_push_token(client, paired):
    r = client.post(
        "/api/v1/patient/push-token",
        json={"expo_push_token": "ExponentPushToken[abc123]"},
        headers=paired["ph"],
    )
    assert r.status_code == 204


def test_sos_alert_notifies_caregivers(client, paired, caplog):
    import logging

    with caplog.at_level(logging.INFO, logger="notifications"):
        client.post("/api/v1/patient/sos", json={}, headers=paired["ph"])
    assert any("ALERT for patient" in m for m in caplog.messages)


def test_medication_reminder_job_pushes_a_due_dose(client, paired, monkeypatch):
    client.post(
        "/api/v1/patient/push-token",
        json={"expo_push_token": "ExponentPushToken[abc123]"},
        headers=paired["ph"],
    )

    spy = SpyPush()
    from app.services import notification_service

    monkeypatch.setattr(notification_service, "get_push_provider", lambda: spy)

    # freeze "now" to 08:05 Asia/Kolkata — the 08:00 dose is due, no log yet
    from app.services import scheduler

    fixed = datetime(2026, 9, 10, 8, 5, tzinfo=ZoneInfo("Asia/Kolkata"))
    monkeypatch.setattr(scheduler, "_patient_local_now", lambda _p: fixed)

    scheduler.medication_reminders()

    assert len(spy.sent) == 1
    _, title, body = spy.sent[0]
    assert "medicine" in title.lower()
    assert "Donepezil" in body


def test_reminder_not_sent_if_already_logged(client, paired, monkeypatch):
    client.post(
        "/api/v1/patient/push-token",
        json={"expo_push_token": "ExponentPushToken[abc123]"},
        headers=paired["ph"],
    )
    meds = client.get(
        f"/api/v1/patients/{paired['pid']}/medications", headers=paired["h"]
    ).json()
    client.post(
        f"/api/v1/patient/medications/{meds[0]['id']}/doses/08:00",
        json={"scheduled_date": "2026-09-10", "status": "taken"},
        headers=paired["ph"],
    )

    spy = SpyPush()
    from app.services import notification_service, scheduler

    monkeypatch.setattr(notification_service, "get_push_provider", lambda: spy)
    monkeypatch.setattr(
        scheduler, "_patient_local_now",
        lambda _p: datetime(2026, 9, 10, 8, 5, tzinfo=ZoneInfo("Asia/Kolkata")),
    )
    scheduler.medication_reminders()
    assert spy.sent == []
