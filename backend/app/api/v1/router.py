"""Aggregates every v1 sub-router into one router that `main.py` mounts under /api/v1.

As new features land (memories, medication, location, ...) each gets its own module
here and one `include_router` line below.
"""

from fastapi import APIRouter

from app.api.v1 import (
    auth,
    devices,
    faces,
    health,
    memories,
    patient,
    patients,
    people,
    profile,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(patients.router)
api_router.include_router(people.patient_people_router)
api_router.include_router(people.people_router)
api_router.include_router(faces.router)
api_router.include_router(faces.faces_router)
api_router.include_router(memories.patient_memories_router)
api_router.include_router(memories.memories_router)
api_router.include_router(devices.patient_devices_router)
api_router.include_router(devices.devices_router)
api_router.include_router(patient.router)
