# Expiry Management Prototype — Package for recipients

This folder is the **full source** of the warehouse UI + FastAPI backend prototype (Flo Lite–style inbound flow, lot capture, shelf-life validation, QC, correction).

## What’s included

- **`frontend/`** — React (Vite) + Tailwind
- **`backend/`** — FastAPI + SQLAlchemy + SQLite (file DB created on first run)
- **`docs/EXTENDING_WITH_SUPABASE.md`** — How to point the backend at Supabase/Postgres instead of SQLite

**Not included in the share zip:** `node_modules/`, `venv/`, local `*.db` files (recipients install dependencies and run locally).

## Quick start

### Prerequisites

- Node.js 18+ and npm  
- Python 3.9+  

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** (Vite proxies `/api` to port 8000).

### Production-style single process (optional)

Build the frontend (`npm run build`), then run uvicorn: the app in `backend/app/main.py` can serve `frontend/dist` when present.

## Test data

- Document IDs like **`IRN-2026-00101`** (see `backend/app/seed.py`)  
- EAN **`8901030793905`** for a happy-path product  

## Customizing

- **Supabase / Postgres:** see `docs/EXTENDING_WITH_SUPABASE.md`  
- **Auth, env, secrets:** add `.env` and load in FastAPI; never commit real keys  
- **UI:** `frontend/src/pages/` and `frontend/src/components/`  

## License / usage

Internal / demo use unless you attach your own license.
