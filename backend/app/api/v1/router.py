"""Aggregates every v1 sub-router into one router that `main.py` mounts under /api/v1.

As new features land (memories, medication, location, ...) each gets its own module
here and one `include_router` line below.
"""

from fastapi import APIRouter

from app.api.v1 import (
    auth,
    devices,
    faces,
    geofences,
    health,
    location,
    medications,
    memories,
    patient,
    patients,
    people,
    profile,
    routines,
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
api_router.include_router(medications.patient_meds_router)
api_router.include_router(medications.meds_router)
api_router.include_router(routines.patient_routines_router)
api_router.include_router(routines.routines_router)
api_router.include_router(location.router)
api_router.include_router(geofences.patient_geo_router)
api_router.include_router(geofences.geo_router)
api_router.include_router(geofences.alerts_router)
api_router.include_router(devices.patient_devices_router)
api_router.include_router(devices.devices_router)
api_router.include_router(patient.router)
