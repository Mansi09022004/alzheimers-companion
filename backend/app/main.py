"""FastAPI application entrypoint.

`create_app()` builds and configures the app. Keeping it in a factory function
(rather than a module-level `app = FastAPI()`) makes it easy for tests to build a
fresh app instance.

Run locally:  uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.project_name,
        version="0.1.0",
        description=(
            "Prototype / portfolio project. NOT a medical device. "
            "Does not provide diagnosis, treatment, or medical advice."
        ),
    )

    # CORS: the mobile app and caregiver dashboard call this API from other origins.
    # Locked down properly in Phase 16; permissive in development only.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if not settings.is_production else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/", tags=["root"])
    def root() -> dict[str, str]:
        return {
            "name": settings.project_name,
            "docs": "/docs",
            "health": f"{settings.api_v1_prefix}/health",
        }

    return app


app = create_app()
