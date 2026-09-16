"""Port of the JPA entities. Table/column names are identical so the
existing MySQL database and data.sql carry over untouched."""
from .extensions import db


class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column("user_id", db.BigInteger, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False)

    # One-to-one side (Java: @OneToOne(mappedBy = "user"), @JsonIgnore)
    profile = db.relationship("Profile", back_populates="user", uselist=False,
                              cascade="all, delete-orphan")

    def to_dict(self):
        # Port of Jackson serialization: userId/name/email, password excluded.
        return {"userId": self.user_id, "name": self.name, "email": self.email}


class Profile(db.Model):
    __tablename__ = "profiles"

    profile_id = db.Column("profile_id", db.BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.user_id"),
                        nullable=False, unique=True)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(255), nullable=False)
    education = db.Column(db.String(255))
    occupation = db.Column(db.String(255))
    about = db.Column(db.String(1000))
    photo_url = db.Column("photo_url", db.String(500))

    user = db.relationship("User", back_populates="profile")

    def to_dict(self):
        # Port of Jackson serialization: camelCase keys, nested user without password.
        return {
            "profileId": self.profile_id,
            "user": self.user.to_dict() if self.user else None,
            "age": self.age,
            "gender": self.gender,
            "city": self.city,
            "education": self.education,
            "occupation": self.occupation,
            "about": self.about,
            "photoUrl": self.photo_url,
        }


class Interest(db.Model):
    __tablename__ = "interests"

    interest_id = db.Column("interest_id", db.BigInteger, primary_key=True, autoincrement=True)
    sender_id = db.Column(db.BigInteger, db.ForeignKey("users.user_id"), nullable=False)
    receiver_id = db.Column(db.BigInteger, db.ForeignKey("users.user_id"), nullable=False)
    status = db.Column(db.String(255), nullable=False)  # PENDING, ACCEPTED, REJECTED

    sender = db.relationship("User", foreign_keys=[sender_id])
    receiver = db.relationship("User", foreign_keys=[receiver_id])

    def to_dict(self):
        return {
            "interestId": self.interest_id,
            "sender": self.sender.to_dict() if self.sender else None,
            "receiver": self.receiver.to_dict() if self.receiver else None,
            "status": self.status,
        }
