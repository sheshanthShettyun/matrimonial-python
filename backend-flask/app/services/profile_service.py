"""Port of ProfileService. Same rules, same messages."""
from ..errors import BadRequestError, NotFoundError
from ..extensions import db
from ..models import Interest, Profile, User


def get_user_or_404(user_id):
    # Port of UserService.getUserById.
    user = db.session.get(User, user_id)
    if user is None:
        raise NotFoundError(f"User not found with ID: {user_id}")
    return user


def create_profile(user_id, data):
    get_user_or_404(user_id)
    if Profile.query.filter_by(user_id=user_id).first() is not None:
        raise BadRequestError("This user already has a profile")
    profile = _apply(data, Profile())
    profile.user_id = user_id
    db.session.add(profile)
    db.session.commit()
    return profile


def get_all_profiles():
    return Profile.query.all()


def get_profile_by_id(profile_id):
    profile = db.session.get(Profile, profile_id)
    if profile is None:
        raise NotFoundError(f"Profile not found with ID: {profile_id}")
    return profile


def get_profile_by_user_id(user_id):
    profile = Profile.query.filter_by(user_id=user_id).first()
    if profile is None:
        raise NotFoundError(f"Profile not found for user ID: {user_id}")
    return profile


def search_profiles(gender, city, age):
    # Port of the JPQL search: case-insensitive, blank/None means "ignore".
    query = Profile.query
    if gender:
        query = query.filter(db.func.lower(Profile.gender) == gender.lower())
    if city:
        query = query.filter(db.func.lower(Profile.city) == city.lower())
    if age is not None:
        query = query.filter(Profile.age == age)
    return query.all()


def update_profile(profile_id, data):
    profile = get_profile_by_id(profile_id)
    _apply(data, profile)
    db.session.commit()
    return profile


def delete_profile(profile_id):
    # Port of the transactional cascade: interests both ways, then the user.
    profile = get_profile_by_id(profile_id)
    user_id = profile.user_id
    Interest.query.filter(
        (Interest.sender_id == user_id) | (Interest.receiver_id == user_id)
    ).delete(synchronize_session=False)
    db.session.delete(profile)
    user = db.session.get(User, user_id)
    if user is not None:
        db.session.delete(user)
    db.session.commit()


def _apply(data, profile):
    # Port of mapRequestToProfile: server-side guards + safe field mapping.
    age = data.get("age")
    if age is None or age < 18:
        raise BadRequestError("Age must be 18 or above")
    if not data.get("gender") or not str(data.get("gender")).strip():
        raise BadRequestError("Gender is required")
    if not data.get("city") or not str(data.get("city")).strip():
        raise BadRequestError("City is required")
    profile.age = age
    profile.gender = data.get("gender")
    profile.city = data.get("city")
    profile.education = data.get("education")
    profile.occupation = data.get("occupation")
    profile.about = data.get("about")
    profile.photo_url = data.get("photoUrl")
    return profile
