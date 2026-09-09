"""Domain exceptions.

Services raise these instead of `HTTPException` so they stay framework-independent.
`app/main.py` registers handlers that turn them into JSON error responses.
"""


class AppError(Exception):
    """Base class. `status_code` and `code` drive the HTTP response."""

    status_code = 400
    code = "bad_request"

    def __init__(self, message: str | None = None):
        super().__init__(message or self.__class__.__name__)
        self.message = message or "Request could not be processed."


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class AuthenticationError(AppError):
    status_code = 401
    code = "authentication_failed"


class PermissionDeniedError(AppError):
    status_code = 403
    code = "permission_denied"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"
