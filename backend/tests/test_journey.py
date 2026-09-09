"""One end-to-end journey through the whole product, exercising the pieces together.

caregiver signs up -> creates a patient -> registers a person + a face -> writes a
memory -> sets a medication, a routine item, a safe zone, an emergency contact ->
pairs a device -> the patient reports a location that exits the zone (alert) ->
presses SOS -> asks the assistant a question and gets a grounded answer.
"""

import pytest

from app.services import vision_client

pytestmark = pytest.mark.usefixtures("clean_db")

IMG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 128
HOME = (12.9716, 77.5946)
FAR = (12.9900, 77.6200)


def test_full_patient_journey(client, monkeypatch):
    monkeypatch.setattr(
        vision_client,
        "embed_face",
        lambda _b, _c: vision_client.Embedding(vector=[0.1] * 512, det_score=0.95, model_version="buffalo_l"),
    )

    # 1. caregiver
    reg = {"email": "journey@ex.com", "password": "strong-pass1", "full_name": "Journey"}
    client.post("/api/v1/auth/register", json=reg)
    tok = client.post("/api/v1/auth/login", json={"email": reg["email"], "password": reg["password"]}).json()["access_token"]
    H = {"Authorization": f"Bearer {tok}"}

    # 2. patient + person + face + memory
    pid = client.post(
        "/api/v1/patients",
        json={"full_name": "Kamala", "home_label": "Home", "home_lat": HOME[0], "home_lng": HOME[1]},
        headers=H,
    ).json()["id"]
    person = client.post(
        f"/api/v1/patients/{pid}/people",
        json={"display_name": "Rahul", "relationship_label": "son"}, headers=H,
    ).json()["id"]
    client.post(f"/api/v1/people/{person}/consent", json={}, headers=H)
    assert client.post(
        f"/api/v1/people/{person}/faces",
        files={"file": ("f.png", IMG, "image/png")}, headers=H,
    ).status_code == 201
    client.post(
        f"/api/v1/patients/{pid}/memories",
        json={"text": "Rahul brought mangoes on Sunday.", "person_id": person}, headers=H,
    )

    # 3. medication, routine, safe zone, contact
    client.post(
        f"/api/v1/patients/{pid}/medications",
        json={"name": "Donepezil", "schedule_times": ["08:00"]}, headers=H,
    )
    client.post(
        f"/api/v1/patients/{pid}/routine-items",
        json={"title": "Breakfast", "time_of_day": "08:30", "days_of_week": [0, 1, 2, 3, 4, 5, 6]}, headers=H,
    )
    client.post(
        f"/api/v1/patients/{pid}/geofences",
        json={"name": "Home", "center_lat": HOME[0], "center_lng": HOME[1], "radius_m": 300}, headers=H,
    )
    client.post(
        f"/api/v1/patients/{pid}/emergency-contacts",
        json={"name": "Rahul", "phone": "+910000000000"}, headers=H,
    )

    # 4. pair a device
    code = client.post(f"/api/v1/patients/{pid}/devices", json={"label": "phone"}, headers=H).json()["pairing_code"]
    ptok = client.post("/api/v1/patient/pair", json={"pairing_code": code}).json()["access_token"]
    PH = {"Authorization": f"Bearer {ptok}"}

    # 5. leave the safe zone -> exit alert
    for _ in range(4):
        client.post("/api/v1/patient/location", json={"lat": FAR[0], "lng": FAR[1], "accuracy_m": 10}, headers=PH)
    alerts = client.get(f"/api/v1/patients/{pid}/alerts", headers=H).json()
    assert any(a["type"] == "geofence_exit" for a in alerts)

    # 6. SOS
    sos = client.post("/api/v1/patient/sos", json={"note": "lost"}, headers=PH).json()
    assert sos["notified_caregivers"] == 1

    # 7. grounded assistant answer
    ans = client.post("/api/v1/patient/ask", json={"question": "Rahul mangoes Sunday"}, headers=PH).json()
    assert ans["grounded"] is True
    assert any("mango" in s["text"].lower() for s in ans["sources"])

    # 8. contextual "why am I here" pulls it together
    why = client.get("/api/v1/patient/why-am-i-here?local_datetime=2026-09-10T08:00", headers=PH).json()
    assert "donepezil" in why["message"].lower() or "medicine" in why["message"].lower()
