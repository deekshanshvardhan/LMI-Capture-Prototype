# LMI Capture Prototype

Warehouse usability prototype: sequential bin scan → EAN/WID scan → LMI attributes → save to Supabase.

## Structure

- `frontend/` — React (Vite), login, camera barcode scanning (ZXing)
- `backend/` — FastAPI, LMI API, Supabase persistence

## Quick start (local)

**Backend**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env         # add SUPABASE_URL and SUPABASE_SERVICE_KEY
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL (HTTPS on LAN for camera). See `backend/supabase_setup.sql` for the `lmi_captures` table.

## Tests

With backend running and `.env` configured:

```bash
cd backend && source venv/bin/activate && python test_lmi.py
```

## Deploy backend first (Render)

Step-by-step: **[docs/DEPLOY_BACKEND_RENDER.md](docs/DEPLOY_BACKEND_RENDER.md)**  
- **Public repo + free tier:** `render.yaml`  
- **Private repo (no public GitHub, no internal hosting):** `render.private.yaml` (Render Starter — paid)

---

## Deploy (Vercel + API + domain)

Vercel serves the **static frontend**. The **FastAPI backend** should run on a Python host (e.g. [Render](https://render.com), [Railway](https://railway.app), or [Fly.io](https://fly.io)) because it is long‑running and uses env secrets. Supabase stays as today.

### 1. Deploy the backend

1. Create a **Web Service** pointing at this repo (or only the `backend/` folder).
2. **Runtime:** Python 3.10+  
3. **Build:** `pip install -r requirements.txt` (run from `backend/`).  
4. **Start:** `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`  
   (Render/Railway set `PORT`; use their docs if the variable name differs.)
5. **Environment variables:**  
   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (same as local `backend/.env`).  
6. Run `supabase_setup.sql` in Supabase if the table is not created yet.
7. Note the public URL, e.g. `https://lmi-api-xxxx.onrender.com`.

**CORS:** `main.py` already allows all origins (`*`). For production you can restrict `allow_origins` to your Vercel URL and custom domain.

### 2. Deploy the frontend on Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework: **Vite** (auto-detected). Build: `npm run build`, output: `dist`.
4. **Environment variable** (Production + Preview as needed):  
   `VITE_API_BASE_URL` = `https://YOUR-BACKEND-HOST/api`  
   (must include the `/api` suffix; same path prefix as FastAPI.)
5. Deploy. Open the `*.vercel.app` URL and test login + LMI save.

`frontend/vercel.json` configures SPA fallback so refreshes work.

### 3. Custom domain (warehouse)

1. Vercel project → **Settings → Domains** → add your domain (e.g. `lmi.yourcompany.com`).
2. Add the DNS records Vercel shows (usually CNAME to `cname.vercel-dns.com` or A records).
3. After HTTPS is active, set `VITE_API_BASE_URL` if unchanged (API URL is separate from the site domain).
4. Optionally restrict backend CORS to `https://lmi.yourcompany.com`.

### Local vs production

| | Local | Production |
|---|--------|------------|
| API base | Vite proxies `/api` → `localhost:8000` | `VITE_API_BASE_URL` → full backend URL + `/api` |

## License

Internal prototype — use as needed for your org.
