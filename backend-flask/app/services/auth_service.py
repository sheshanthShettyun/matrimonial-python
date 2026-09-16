"""Port of AuthService. Same rules, same messages."""
from flask import session

from ..errors import ConflictError, UnauthorizedError
from ..extensions import bcrypt, db
from ..models import User


def _auth_response(user):
    # Port of the AuthResponse DTO: userId/name/email/hasProfile/profileId.
    profile = user.profile
    return {
        "userId": user.user_id,
        "name": user.name,
        "email": user.email,
        "hasProfile": profile is not None,
        "profileId": profile.profile_id if profile else None,
    }


def _login_session(user):
    # Port of setAuthenticationInContext: remember who is logged in.
    session["user_id"] = user.user_id
    session["email"] = user.email


def register(data):
    email = (data.get("email") or "").strip().lower()

    if User.query.filter(db.func.lower(User.email) == email).first() is not None:
        raise ConflictError("Email already registered. Please click 'Log In' below to sign in.")

    user = User(
        name=(data.get("name") or "").strip(),
        email=email,
        password=bcrypt.generate_password_hash(data.get("password")).decode("utf-8"),
    )
    db.session.add(user)
    db.session.commit()

    _login_session(user)  # auto-login after registration
    return _auth_response(user)


def login(data):
    email = (data.get("email") or "").strip().lower()

    # Same message for missing user and wrong password (anti-enumeration).
    user = User.query.filter(db.func.lower(User.email) == email).first()
    if user is None:
        raise UnauthorizedError("Invalid email or password")

    raw_password = data.get("password") or ""
    if not user.password or not user.password.strip():
        raise UnauthorizedError("Invalid email or password")
    if not bcrypt.check_password_hash(user.password, raw_password):
        raise UnauthorizedError("Invalid email or password")

    _login_session(user)
    return _auth_response(user)


def logout():
    session.clear()


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        raise UnauthorizedError("User not authenticated")
    user = db.session.get(User, user_id)
    if user is None:
        raise UnauthorizedError("User not found")
    return _auth_response(user)
