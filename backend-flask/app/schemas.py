"""Port of the jakarta-validation DTOs. Same fields, same messages."""
from marshmallow import Schema, fields, validate, validates_schema, ValidationError


def _not_blank(message):
    def check(value):
        if value is None or not str(value).strip():
            raise ValidationError(message)
    return check


class BaseSchema(Schema):
    class Meta:
        # Java's ProfileRequest DTO would 400 on unknown JSON props; being
        # lenient here keeps the frontend working no matter what it sends.
        unknown = "exclude"


class RegisterSchema(BaseSchema):
    name = fields.Str(required=True, error_messages={"required": "Name is required"})
    email = fields.Email(required=True, error_messages={
        "required": "Email is required", "invalid": "Invalid email format"})
    password = fields.Str(required=True)
    confirmPassword = fields.Str(required=True)

    @validates_schema
    def check_passwords_match(self, data, **kwargs):
        # Port of RegisterRequest.isPasswordMatching -> "Passwords do not match".
        if data.get("password") != data.get("confirmPassword"):
            raise ValidationError("Passwords do not match")


class LoginSchema(BaseSchema):
    email = fields.Email(required=True, error_messages={
        "required": "Email is required", "invalid": "Invalid email format"})
    password = fields.Str(required=True)


class ProfileSchema(BaseSchema):
    # Port of ProfileRequest constraints, messages kept identical.
    age = fields.Int(
        required=True,
        validate=[
            validate.Range(min=18, error="Age must be 18 or above"),
            validate.Range(max=99, error="Age must be 99 or below"),
        ],
        error_messages={"required": "Age is required",
                        "invalid": "Age must be 18 or above"},
    )
    gender = fields.Str(required=True, validate=_not_blank("Gender is required"),
                        error_messages={"required": "Gender is required"})
    city = fields.Str(required=True,
                      validate=[_not_blank("City is required"),
                                validate.Length(max=100)],
                      error_messages={"required": "City is required"})
    education = fields.Str(required=False, allow_none=True,
                           validate=validate.Length(max=200))
    occupation = fields.Str(required=False, allow_none=True,
                            validate=validate.Length(max=200))
    about = fields.Str(required=False, allow_none=True,
                       validate=validate.Length(max=1000))
    photoUrl = fields.Str(required=False, allow_none=True,
                          validate=validate.Length(max=500))


class SendInterestSchema(BaseSchema):
    # Port of SendInterestRequest.
    senderId = fields.Int(required=True,
                          error_messages={"required": "Sender ID is required"})
    receiverId = fields.Int(required=True,
                            error_messages={"required": "Receiver ID is required"})
