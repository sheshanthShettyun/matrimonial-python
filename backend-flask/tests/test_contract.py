"""Contract tests: Flask behavior must match the Java backend endpoint-by-endpoint.

Status codes, JSON keys (camelCase), nested shapes, and exact messages are
asserted — these are what the Next.js frontend depends on.
"""
import io

import pytest

from app import create_app
from app.extensions import bcrypt, db
from app.models import Interest, Profile, User

TEST_DB = "mysql+pymysql://root:root@127.0.0.1:3306/matrimonial_test_db"


@pytest.fixture()
def client():
    # NOTE: the app context is NOT held open during the test. Each
    # test-client request and each helper `with` block gets its own
    # context (with proper teardown), so no stale REPEATABLE-READ
    # snapshot can hide committed rows from later requests.
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": TEST_DB,
        "SECRET_KEY": "test-secret",
    })
    with app.app_context():
        db.drop_all()
        db.create_all()
    yield app.test_client()
    with app.app_context():
        db.session.remove()
        db.drop_all()


def _user(client, name="Asha", email="asha@test.com", pw="secret123"):
    with client.application.app_context():
        u = User(name=name, email=email,
                 password=bcrypt.generate_password_hash(pw).decode())
        db.session.add(u)
        db.session.commit()
        return u.user_id


def _profile(client, user_id, **over):
    data = {"age": 25, "gender": "Female", "city": "Mumbai",
            "education": "BSc", "occupation": "Dev", "about": "Hi",
            "photoUrl": "/x.jpg"}
    data.update(over)
    with client.application.app_context():
        p = Profile(user_id=user_id, age=data["age"], gender=data["gender"],
                    city=data["city"], education=data["education"],
                    occupation=data["occupation"], about=data["about"],
                    photo_url=data["photoUrl"])
        db.session.add(p)
        db.session.commit()
        return p.profile_id


def _envelope(body):
    assert set(body.keys()) == {"timestamp", "status", "error", "message"}
    return body


# ---------- auth ----------

def test_register_201_and_keys_and_autologin(client):
    r = client.post("/api/auth/register", json={
        "name": "Asha", "email": "Asha@Test.com",
        "password": "secret123", "confirmPassword": "secret123"})
    assert r.status_code == 201
    body = r.get_json()
    assert set(body.keys()) == {"userId", "name", "email", "hasProfile", "profileId"}
    assert body["email"] == "asha@test.com"  # normalized
    assert body["hasProfile"] is False and body["profileId"] is None
    me = client.get("/api/auth/me")  # same client = session cookie kept
    assert me.status_code == 200 and me.get_json()["email"] == "asha@test.com"


def test_register_duplicate_409_exact_message(client):
    client.post("/api/auth/register", json={
        "name": "A", "email": "a@test.com", "password": "x1234567", "confirmPassword": "x1234567"})
    r = client.post("/api/auth/register", json={
        "name": "B", "email": "A@TEST.com", "password": "x1234567", "confirmPassword": "x1234567"})
    assert r.status_code == 409
    body = _envelope(r.get_json())
    assert body["message"] == "Email already registered. Please click 'Log In' below to sign in."


def test_register_password_mismatch_400(client):
    r = client.post("/api/auth/register", json={
        "name": "A", "email": "a@test.com", "password": "x", "confirmPassword": "y"})
    assert r.status_code == 400


def test_register_bad_email_400(client):
    r = client.post("/api/auth/register", json={
        "name": "A", "email": "not-an-email", "password": "x1234567", "confirmPassword": "x1234567"})
    assert r.status_code == 400


def test_login_ok_and_profile_flags(client):
    _user(client)
    r = client.post("/api/auth/login", json={"email": "ASHA@test.com", "password": "secret123"})
    assert r.status_code == 200
    assert r.get_json()["hasProfile"] is False


def test_login_wrong_password_and_unknown_user_same_401(client):
    _user(client)
    for payload in ({"email": "asha@test.com", "password": "wrong"},
                    {"email": "nobody@test.com", "password": "wrong"}):
        r = client.post("/api/auth/login", json=payload)
        assert r.status_code == 401
        assert _envelope(r.get_json())["message"] == "Invalid email or password"


def test_me_anonymous_401_and_logout_flow(client):
    assert client.get("/api/auth/me").status_code == 401
    _user(client)
    client.post("/api/auth/login", json={"email": "asha@test.com", "password": "secret123"})
    assert client.get("/api/auth/me").status_code == 200
    r = client.post("/api/auth/logout")
    assert r.status_code == 200 and r.get_json() == {"message": "Logged out successfully"}
    assert client.get("/api/auth/me").status_code == 401


def test_protected_routes_need_login(client):
    assert client.get("/api/profiles").status_code == 401
    assert client.get("/api/interests/match?user1=1&user2=2").status_code == 401


def _authed(client, email="asha@test.com", pw="secret123", name="Asha"):
    client.post("/api/auth/register", json={
        "name": name, "email": email, "password": pw, "confirmPassword": pw})


# ---------- profiles ----------

def test_profile_crud_and_shapes(client):
    _authed(client)
    with client.application.app_context():
        uid = User.query.filter_by(email="asha@test.com").first().user_id
    r = client.post(f"/api/profiles/user/{uid}", json={
        "age": 25, "gender": "Female", "city": "Mumbai"})
    assert r.status_code == 201
    body = r.get_json()
    assert set(body.keys()) == {"profileId", "user", "age", "gender", "city",
                                "education", "occupation", "about", "photoUrl"}
    assert set(body["user"].keys()) == {"userId", "name", "email"}  # no password
    pid = body["profileId"]

    dup = client.post(f"/api/profiles/user/{uid}", json={"age": 30, "gender": "Male", "city": "Delhi"})
    assert dup.status_code == 400
    assert _envelope(dup.get_json())["message"] == "This user already has a profile"

    assert client.get("/api/profiles/9999").status_code == 404
    nf = client.get("/api/profiles/9999").get_json()
    assert _envelope(nf)["message"] == "Profile not found with ID: 9999"

    assert client.get("/api/profiles/user/9999").status_code == 404

    up = client.put(f"/api/profiles/{pid}", json={"age": 26, "gender": "Female", "city": "Pune"})
    assert up.status_code == 200 and up.get_json()["city"] == "Pune"

    bad = client.put(f"/api/profiles/{pid}", json={"age": 15, "gender": "F", "city": "X"})
    assert bad.status_code == 400

    assert [p["profileId"] for p in client.get("/api/profiles").get_json()] == [pid]

    d = client.delete(f"/api/profiles/{pid}")
    assert d.status_code == 200 and d.get_json() == {"message": "Profile deleted successfully"}
    # cascade: user gone too
    assert client.post("/api/auth/login",
                       json={"email": "asha@test.com", "password": "secret123"}).status_code == 401


def test_search_semantics(client):
    _authed(client)
    u1 = _user(client, "A", "a@test.com")
    u2 = _user(client, "B", "b@test.com")
    _profile(client, u1, gender="Female", city="Mumbai", age=25)
    _profile(client, u2, gender="Male", city="Delhi", age=30)
    assert len(client.get("/api/profiles/search?gender=female").get_json()) == 1  # case-insensitive
    assert len(client.get("/api/profiles/search?city=DELHI").get_json()) == 1
    assert len(client.get("/api/profiles/search?age=30").get_json()) == 1
    assert len(client.get("/api/profiles/search?gender=&city=").get_json()) == 2  # blank ignored
    assert client.get("/api/profiles/search?gender=Female&city=Delhi").get_json() == []


# ---------- interests ----------

def _two_users_authed(client):
    _authed(client, "a@test.com", "pw123456", "A")
    client.post("/api/auth/logout")
    _authed(client, "b@test.com", "pw123456", "B")
    with client.application.app_context():
        a = User.query.filter_by(email="a@test.com").first().user_id
        b = User.query.filter_by(email="b@test.com").first().user_id
    return a, b


def test_interest_flow_match_and_errors(client):
    a, b = _two_users_authed(client)
    r = client.post("/api/interests/send", json={"senderId": a, "receiverId": b})
    assert r.status_code == 201
    body = r.get_json()
    assert set(body.keys()) == {"interestId", "sender", "receiver", "status"}
    assert body["status"] == "PENDING"
    iid = body["interestId"]

    dup = client.post("/api/interests/send", json={"senderId": a, "receiverId": b})
    assert dup.status_code == 409
    assert _envelope(dup.get_json())["message"] == \
        "An interest request is already pending for this user"

    me_self = client.post("/api/interests/send", json={"senderId": a, "receiverId": a})
    assert me_self.status_code == 400

    assert client.get(f"/api/interests/match?user1={a}&user2={b}").get_json() == {"matched": False}

    acc = client.put(f"/api/interests/{iid}/accept")
    assert acc.status_code == 200 and acc.get_json()["status"] == "ACCEPTED"
    # reverse accept -> mutual match
    r2 = client.post("/api/interests/send", json={"senderId": b, "receiverId": a})
    client.put(f"/api/interests/{r2.get_json()['interestId']}/accept")
    assert client.get(f"/api/interests/match?user1={a}&user2={b}").get_json() == {"matched": True}

    assert len(client.get(f"/api/interests/sent/{a}").get_json()) == 1
    assert len(client.get(f"/api/interests/received/{b}").get_json()) == 1

    assert client.put("/api/interests/9999/reject").status_code == 404
    assert client.delete(f"/api/interests/{iid}").status_code == 204
    assert client.get(f"/api/interests/match?user1={a}&user2={b}").get_json() == {"matched": False}


# ---------- upload ----------

def test_upload_shapes(client):
    _authed(client)
    r = client.post("/api/upload/profile-photo", data={})
    assert r.status_code == 400 and r.get_json() == {"error": "No file provided"}

    bad = client.post("/api/upload/profile-photo", data={
        "file": (io.BytesIO(b"hello"), "note.txt")}, content_type="multipart/form-data")
    assert bad.status_code == 400 and bad.get_json() == {"error": "Only image files are allowed"}

    png = (b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    ok = client.post("/api/upload/profile-photo", data={
        "file": (io.BytesIO(png), "pic.png", "image/png")},
        content_type="multipart/form-data")
    assert ok.status_code == 200
    url = ok.get_json()["url"]
    assert url.startswith("/uploads/profiles/") and "filename" in ok.get_json()
    assert client.get(url).status_code == 200
