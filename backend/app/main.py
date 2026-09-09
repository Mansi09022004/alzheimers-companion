"""FastAPI application entrypoint.

`create_app()` builds and configures the app. Keeping it in a factory function
(rather than a module-level `app = FastAPI()`) makes it easy for tests to build a
fresh app instance.

Run locally:  uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError


@asynccontextmanager
async def _lifespan(_: FastAPI):
    settings = get_settings()
    if settings.enable_scheduler:
        from app.services import scheduler

        scheduler.start()
        yield
        scheduler.shutdown()
    else:
        yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.project_name,
        version="0.1.0",
        description=(
            "Prototype / portfolio project. NOT a medical device. "
            "Does not provide diagnosis, treatment, or medical advice."
        ),
        lifespan=_lifespan,
    )

    # CORS: the mobile app and caregiver dashboard call this API from other origins.
    origins = settings.cors_origins if settings.is_production else ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def _security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.exception_handler(AppError)
    async def _handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
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
