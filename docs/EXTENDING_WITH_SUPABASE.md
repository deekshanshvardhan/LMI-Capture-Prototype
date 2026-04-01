# Extending the prototype with Supabase (or any Postgres)

The backend uses **SQLAlchemy + SQLite** (`backend/app/database.py`). To move to **Supabase** (hosted Postgres):

## 1. Create a Supabase project

- Create a project at [supabase.com](https://supabase.com), note the **connection string** (Settings → Database → URI, use the *transaction* pooler or direct connection as appropriate).

## 2. Replace the database URL

In `backend/app/database.py`, switch from SQLite to Postgres:

```python
import os
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "sqlite:///./expiry_prototype.db",  # local fallback
)
# For Supabase, set env: DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/postgres
engine = create_engine(DATABASE_URL, ...)
```

Add **`psycopg2-binary`** (or **`asyncpg`** if you move to async) to `backend/requirements.txt`.

## 3. Run migrations / create tables

- Either keep `Base.metadata.create_all(engine)` on startup (fine for prototypes), or introduce **Alembic** for real migrations.
- Seed data: run `seed.py` logic once, or insert via Supabase SQL editor using the same schema as `backend/app/models.py`.

## 4. Environment variables

- Store `DATABASE_URL` in `.env` (do not commit). Load with `python-dotenv` in `main.py` if you add it to `requirements.txt`.

## 5. Row Level Security (RLS)

- If you use Supabase Auth on the client, enable RLS on tables and policies per tenant/warehouse. The current FastAPI app is **server-side only**; RLS applies when the client talks to Supabase directly.

## 6. Optional: Supabase only for auth / storage

- Keep FastAPI + SQLite/Postgres for business logic; use Supabase **Auth** JWT validation in FastAPI middleware, or Supabase **Storage** for uploaded images—without moving all data.

## Files to touch first

| Area | Files |
|------|--------|
| DB connection | `backend/app/database.py` |
| Models | `backend/app/models.py` (Postgres types are mostly compatible; check `Enum` / SQLite-specific bits) |
| Seed | `backend/app/seed.py` |
| Config | New `.env.example` with `DATABASE_URL=` |

This prototype does not ship with Supabase wired in; the steps above are the minimal path to connect it.
