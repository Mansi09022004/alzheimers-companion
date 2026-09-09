"""Aggregates every v1 sub-router into one router that `main.py` mounts under /api/v1.

As new features land (auth, patients, people, memories, ...) each gets its own module
here and one `include_router` line below.
"""

from fastapi import APIRouter

from app.api.v1 import auth, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
