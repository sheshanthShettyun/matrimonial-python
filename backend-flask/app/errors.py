"""Port of GlobalExceptionHandler: every error becomes the same JSON envelope.

Java shape: {"timestamp": ..., "status": <code>, "error": "<reason>", "message": <msg>}
"""
from datetime import datetime

from flask import jsonify
from marshmallow import ValidationError
from werkzeug.exceptions import HTTPException


class NotFoundError(RuntimeError):
    """Port of UserNotFoundException / ProfileNotFoundException / InterestNotFoundException -> 404."""


class ConflictError(RuntimeError):
    """Port of DuplicateEmailException / IllegalStateException -> 409."""


class BadRequestError(RuntimeError):
    """Port of IllegalArgumentException -> 400."""


class UnauthorizedError(RuntimeError):
    """Port of BadCredentialsException -> 401."""


_REASONS = {
    400: "Bad Request",
    401: "Unauthorized",
    404: "Not Found",
    409: "Conflict",
    500: "Internal Server Error",
}


def error_response(status_code, message):
    body = {
        "timestamp": datetime.now().isoformat(),
        "status": status_code,
        "error": _REASONS.get(status_code, "Error"),
        "message": message,
    }
    return jsonify(body), status_code


def register_error_handlers(app):
    @app.errorhandler(NotFoundError)
    def handle_not_found(exc):
        return error_response(404, str(exc))

    @app.errorhandler(ConflictError)
    def handle_conflict(exc):
        return error_response(409, str(exc))

    @app.errorhandler(BadRequestError)
    def handle_bad_request(exc):
        return error_response(400, str(exc))

    @app.errorhandler(UnauthorizedError)
    def handle_unauthorized(exc):
        return error_response(401, str(exc))

    @app.errorhandler(ValidationError)
    def handle_validation(exc):
        # Port of MethodArgumentNotValidException handling:
        # "field: message, field: message"
        parts = []
        for field, messages in exc.messages.items():
            if isinstance(messages, list):
                for msg in messages:
                    parts.append(f"{field}: {msg}")
            else:
                parts.append(f"{field}: {messages}")
        return error_response(400, ", ".join(parts) if parts else "Validation failed")

    @app.errorhandler(HTTPException)
    def handle_http(exc):
        # Unauthenticated /api/** access lands here as 401 (port of HttpStatusEntryPoint).
        # Only "message" is customized; keep envelope shape.
        if exc.code == 401:
            return error_response(401, "Unauthorized")
        return error_response(exc.code or 500, exc.description)

    @app.errorhandler(Exception)
    def handle_general(exc):
        # Port of the catch-all handler -> 500.
        return error_response(500, f"Something went wrong: {exc}")
