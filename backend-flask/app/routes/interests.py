"""Port of InterestController (/api/interests). All routes require login."""
from flask import Blueprint, jsonify, request

from ..guard import login_required
from ..schemas import SendInterestSchema
from ..services import interest_service

bp = Blueprint("interests", __name__)


@bp.post("/send")
@login_required
def send_interest():
    data = SendInterestSchema().load(request.get_json(force=True, silent=True) or {})
    interest = interest_service.send_interest(data["senderId"], data["receiverId"])
    return jsonify(interest.to_dict()), 201


@bp.get("/sent/<int:sender_id>")
@login_required
def get_sent_interests(sender_id):
    items = interest_service.get_sent_interests(sender_id)
    return jsonify([i.to_dict() for i in items]), 200


@bp.get("/received/<int:receiver_id>")
@login_required
def get_received_interests(receiver_id):
    items = interest_service.get_received_interests(receiver_id)
    return jsonify([i.to_dict() for i in items]), 200


@bp.put("/<int:interest_id>/accept")
@login_required
def accept_interest(interest_id):
    return jsonify(interest_service.accept_interest(interest_id).to_dict()), 200


@bp.put("/<int:interest_id>/reject")
@login_required
def reject_interest(interest_id):
    return jsonify(interest_service.reject_interest(interest_id).to_dict()), 200


@bp.delete("/<int:interest_id>")
@login_required
def delete_interest(interest_id):
    interest_service.delete_interest(interest_id)
    return "", 204


@bp.get("/match")
@login_required
def check_match():
    user1 = int(request.args["user1"])
    user2 = int(request.args["user2"])
    return jsonify({"matched": interest_service.is_matched(user1, user2)}), 200
