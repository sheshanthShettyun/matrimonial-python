"""Port of the SecurityConfig '/api/** -> authenticated' rule.

Public (no session needed): register, login, logout.
Everything else under /api/** requires session["user_id"], else 401.
"""
from functools import wraps

from flask import session

from .errors import UnauthorizedError


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        # Port of getCurrentUser()'s anonymous check.
        if not session.get("user_id"):
            raise UnauthorizedError("User not authenticated")
        return view(*args, **kwargs)
    return wrapper


def current_user_id():
    return session.get("user_id")
