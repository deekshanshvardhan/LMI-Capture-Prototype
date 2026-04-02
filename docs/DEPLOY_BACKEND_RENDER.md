# Deploy backend first (Render)

Use this so you get a URL like `https://lmi-capture-api.onrender.com` before deploying the UI.

## Can’t make the repo public and no Flipkart hosting?

You’re not stuck — you just can’t use **Render’s free web tier** for a **private** repo.

| Approach | Notes |
|----------|--------|
| **Render Starter (paid)** | Connect your **private** repo; use **`render.private.yaml`** in this repo (`plan: starter`). Small monthly cost; no need to go public. |
| **Other PaaS with private GitHub** | **Fly.io**, **Railway**, **Google Cloud Run**, etc. — same idea: you pay a little (or use credits) and OAuth to the private repo. |
| **Warehouse network** | HHDs must be allowed to reach your **API host** (e.g. `*.onrender.com`) unless you later put an **internal reverse proxy** in front. Ask network/security to **allowlist** that hostname if outbound traffic is restricted. |
| **UI** | Static build still needs a URL HHDs can open — could be same class of public static host with **`VITE_API_BASE_URL`** pointing at Render, **or** a simple internal static bucket if your org adds it later. |

**Blueprint for private repo:** In Render, create a Blueprint and point it at **`render.private.yaml`** (or copy its contents into `render.yaml` if you prefer a single file). See [Render pricing](https://render.com/pricing).

---

**Public repo only:** use root **`render.yaml`** with `plan: free`.

## Prerequisites

- GitHub repo pushed (e.g. `LMI-Capture-Prototype`).
- Supabase project with `lmi_captures` table (`backend/supabase_setup.sql` already run).
- Supabase **Project URL** and **service_role** key (Dashboard → Project Settings → API).

---

## Option A — Blueprint (fastest)

1. Open [Render Dashboard](https://dashboard.render.com) → sign up / log in (GitHub).
2. **New** → **Blueprint**.
3. Connect the repo that contains `render.yaml` at the **root** (same level as `backend/`).
4. Render reads `render.yaml` → review the **lmi-capture-api** service → **Apply**.
5. When prompted, set **Environment** variables (or add after create):
   - `SUPABASE_URL` = `https://YOUR_PROJECT_REF.supabase.co`
   - `SUPABASE_SERVICE_KEY` = your service role JWT
6. Wait for **Deploy** to finish (first build ~5–10 min).

---

## Option B — Manual Web Service

1. **New** → **Web Service** → connect repo.
2. Settings:
   - **Name:** e.g. `lmi-capture-api`
   - **Region:** Singapore (or closest to you)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Instance type:** Free.
4. **Environment** → add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
5. **Advanced** → **Health Check Path:** `/api/health` (optional but useful).
6. **Create Web Service**.

---

## Verify

In a browser or terminal:

```bash
curl https://YOUR-SERVICE.onrender.com/api/health
```

Expected: `{"status":"ok","service":"expiry-management-prototype"}`

Test LMI (optional):

```bash
curl -s -X POST https://YOUR-SERVICE.onrender.com/api/lmi/capture \
  -H "Content-Type: application/json" \
  -d '{"bin_id":"DEPLOY-TEST","scan_value":"1234567890123","scan_type":"EAN","mfg_date":"2026-01-01","expiry_date":"2027-01-01"}'
```

You should get JSON with `id` and `shelf_life_days`. Check the row in Supabase.

---

## For the UI (later)

Set on your static host:

`VITE_API_BASE_URL=https://YOUR-SERVICE.onrender.com/api`

---

## Free tier notes

- Service **spins down** after ~15 minutes idle; first request after that can take **30–60 seconds**.
- **Ephemeral disk** — local SQLite resets on redeploy; LMI data stays in **Supabase**.

---

## Fix a bug after deploy

1. Fix code locally → commit → push to `main`.
2. Render **auto-deploys** (if enabled) or click **Manual Deploy** → **Clear build cache & deploy** if needed.
