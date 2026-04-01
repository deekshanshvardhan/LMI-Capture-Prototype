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

## License

Internal prototype — use as needed for your org.
