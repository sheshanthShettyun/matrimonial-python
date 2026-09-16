"""Port of AuthController (/api/auth)."""
from flask import Blueprint, jsonify, request

from ..guard import login_required
from ..schemas import LoginSchema, RegisterSchema
from ..services import auth_service

bp = Blueprint("auth", __name__)


@bp.post("/register")
def register():
    data = RegisterSchema().load(request.get_json(force=True, silent=True) or {})
    return jsonify(auth_service.register(data)), 201


@bp.post("/login")
def login():
    data = LoginSchema().load(request.get_json(force=True, silent=True) or {})
    return jsonify(auth_service.login(data)), 200


@bp.post("/logout")
def logout():
    auth_service.logout()
    return jsonify({"message": "Logged out successfully"}), 200


@bp.get("/me")
@login_required
def me():
    return jsonify(auth_service.get_current_user()), 200
