"""Port of InterestService. Same rules, same messages."""
from ..errors import BadRequestError, ConflictError, NotFoundError
from ..extensions import db
from ..models import Interest
from .profile_service import get_user_or_404

PENDING = "PENDING"
ACCEPTED = "ACCEPTED"
REJECTED = "REJECTED"


def send_interest(sender_id, receiver_id):
    if sender_id == receiver_id:
        raise BadRequestError("A user cannot send interest to themselves")
    exists = Interest.query.filter_by(
        sender_id=sender_id, receiver_id=receiver_id, status=PENDING).first()
    if exists is not None:
        raise ConflictError("An interest request is already pending for this user")
    sender = get_user_or_404(sender_id)
    receiver = get_user_or_404(receiver_id)

    interest = Interest(sender_id=sender.user_id, receiver_id=receiver.user_id,
                        status=PENDING)
    db.session.add(interest)
    db.session.commit()
    return interest


def get_sent_interests(sender_id):
    return Interest.query.filter_by(sender_id=sender_id).all()


def get_received_interests(receiver_id):
    return Interest.query.filter_by(receiver_id=receiver_id).all()


def _get_or_404(interest_id):
    interest = db.session.get(Interest, interest_id)
    if interest is None:
        raise NotFoundError(f"Interest not found with ID: {interest_id}")
    return interest


def accept_interest(interest_id):
    interest = _get_or_404(interest_id)
    interest.status = ACCEPTED
    db.session.commit()
    return interest


def reject_interest(interest_id):
    interest = _get_or_404(interest_id)
    interest.status = REJECTED
    db.session.commit()
    return interest


def delete_interest(interest_id):
    interest = _get_or_404(interest_id)
    db.session.delete(interest)
    db.session.commit()


def is_matched(user1_id, user2_id):
    """A match exists when both users have ACCEPTED interests toward each other."""
    forward = Interest.query.filter_by(
        sender_id=user1_id, receiver_id=user2_id, status=ACCEPTED).first()
    backward = Interest.query.filter_by(
        sender_id=user2_id, receiver_id=user1_id, status=ACCEPTED).first()
    return forward is not None and backward is not None
