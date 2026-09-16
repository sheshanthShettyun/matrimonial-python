"""Port of ProfileController (/api/profiles). All routes require login."""
from flask import Blueprint, jsonify, request

from ..guard import login_required
from ..schemas import ProfileSchema
from ..services import profile_service

bp = Blueprint("profiles", __name__)


@bp.post("/user/<int:user_id>")
@login_required
def create_profile(user_id):
    data = ProfileSchema().load(request.get_json(force=True, silent=True) or {})
    return jsonify(profile_service.create_profile(user_id, data).to_dict()), 201


@bp.get("")
@login_required
def get_all_profiles():
    return jsonify([p.to_dict() for p in profile_service.get_all_profiles()]), 200


@bp.get("/search")
@login_required
def search_profiles():
    # Port of @RequestParam(required = false): absent/blank means "ignore".
    gender = request.args.get("gender") or None
    city = request.args.get("city") or None
    age_raw = request.args.get("age")
    age = int(age_raw) if age_raw not in (None, "") else None
    results = profile_service.search_profiles(gender, city, age)
    return jsonify([p.to_dict() for p in results]), 200


@bp.get("/user/<int:user_id>")
@login_required
def get_profile_by_user_id(user_id):
    return jsonify(profile_service.get_profile_by_user_id(user_id).to_dict()), 200


@bp.get("/<int:profile_id>")
@login_required
def get_profile_by_id(profile_id):
    return jsonify(profile_service.get_profile_by_id(profile_id).to_dict()), 200


@bp.put("/<int:profile_id>")
@login_required
def update_profile(profile_id):
    data = ProfileSchema().load(request.get_json(force=True, silent=True) or {})
    return jsonify(profile_service.update_profile(profile_id, data).to_dict()), 200


@bp.delete("/<int:profile_id>")
@login_required
def delete_profile(profile_id):
    profile_service.delete_profile(profile_id)
    return jsonify({"message": "Profile deleted successfully"}), 200
