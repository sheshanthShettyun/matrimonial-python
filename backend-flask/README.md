# HeartMate Backend — Flask port

Python (Flask) port of the Spring Boot backend. Same API, same MySQL tables,
same JSON — the Next.js frontend works unchanged (point it at this server).

## Run

```bash
# 1. MySQL on 127.0.0.1:3306, user root / password root
#    (same DB as the Java backend: matrimonial_jpa_db)

# 2. First time only
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
cp .env.example .env   # then set a real SECRET_KEY

# 3. Create tables (dev) + optional seed
./venv/bin/python -c "from app import create_app; from app.extensions import db; \
  app = create_app(); app.app_context().push(); db.create_all()"
mysql -u root -p matrimonial_jpa_db < ../backend/src/main/resources/data.sql

# 4. Serve (default :8080 to match the frontend's api.ts baseURL)
./venv/bin/python run.py
# or: FLASK_PORT=8081 ./venv/bin/python run.py
```

Seed logins (from `data.sql`): `sriyaan@example.com` / `password123`
(Priya: `priya@example.com` / `password123`, etc.)

## Tests

```bash
./venv/bin/python -m pytest tests/ -q
```
Contract tests run against `matrimonial_test_db` (created automatically if missing —
create it once: `CREATE DATABASE matrimonial_test_db;`). They assert every
endpoint's status codes, JSON keys, and exact error messages match the Java backend.

## Layout

```
app/
  __init__.py    # factory: config, CORS, sessions, error handlers, blueprints
  models.py      # User / Profile / Interest (same table+column names as JPA)
  schemas.py     # marshmallow DTOs (port of the @Valid request classes)
  guard.py       # login_required (port of the SecurityConfig URL rules)
  errors.py      # JSON error envelope (port of GlobalExceptionHandler)
  services/      # auth / profile / interest logic (ported 1:1 from Java)
  routes/        # auth / profiles / interests / upload blueprints
```

## Notes for Flask beginners

- Everything is synchronous — no `async`/`await`.
- Sessions are Flask's built-in signed cookies (`session["user_id"]`).
  Everyone re-logs-in once at cutover (cookie format differs from JSESSIONID).
- `data.sql` and the live database carry over untouched, including passwords:
  Flask-Bcrypt verifies the existing `$2b$` hashes as-is.
