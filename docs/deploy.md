# BillBook API Deployment & Infrastructure Guide

**Phase 2: Backend and Database Foundation**  
**Live Deployed URL:** `https://powerful-giving-labeled-advances.trycloudflare.com`  
**Health Check URL:** `https://powerful-giving-labeled-advances.trycloudflare.com/health`  
*(Accessible from any real phone browser or mobile Expo Go app without LAN restrictions)*

---

## 1. Live Deployment Details

- **Public Endpoint:** `https://powerful-giving-labeled-advances.trycloudflare.com`
- **Base API Path:** `https://powerful-giving-labeled-advances.trycloudflare.com/api/v1`
- **Health Verification:**
  ```bash
  curl -s https://powerful-giving-labeled-advances.trycloudflare.com/health
  # Response: {"status":"healthy","timestamp":"2026-10-25T07:45:56Z","version":"1.0.0"}
  ```
- **Mobile Integration:**
  In `mobile/.env`:
  ```ini
  EXPO_PUBLIC_API_URL=https://powerful-giving-labeled-advances.trycloudflare.com/api/v1
  EXPO_PUBLIC_USE_MOCK=false
  ```

---

## 2. Render Deployment (Step-by-Step)

### 2.1 Web Service Setup
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Select your repository: `Ankit-Tank/Bill-Book`.
4. Configure the service settings:
   - **Name:** `billbook-api`
   - **Region:** Singapore (`singapore`) or Frankfurt (closest to your Supabase region).
   - **Branch:** `develop` or `main`.
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3` or `Docker`.
   - **Build Command (if Python):** `pip install -r requirements.txt`
   - **Start Command (if Python):** `gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 wsgi:app`
   - **Instance Type:** Free or Starter.

### 2.2 Environment Variables on Render
Add the following under **Environment**:
| Key | Value / Description |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require` |
| `API_KEY` | `billbook-secret-dev-key` (or your chosen internal key) |
| `FLASK_ENV` | `production` |
| `PYTHONUNBUFFERED` | `1` |
| `PORT` | `5000` (Render binds automatically to `$PORT`) |

### 2.3 Health Check Path on Render
Set **Health Check Path** to `/health` or `/api/v1/health`.

---

## 3. Railway Deployment (Step-by-Step)

### 3.1 New Project Setup
1. Log in to [Railway](https://railway.app).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select `Bill-Book`.
4. Under service **Settings**:
   - **Root Directory:** `/backend`
   - **Builder:** `NIXPACKS` or `DOCKERFILE`.
   - Railway detects `backend/Dockerfile` automatically.

### 3.2 Environment Variables on Railway
In Railway **Variables** tab:
- `DATABASE_URL`: Your Supabase connection string.
- `API_KEY`: `billbook-secret-dev-key`.
- `PORT`: `5000` (or Railway's default `$PORT`).

### 3.3 Public Domain
1. In the service **Settings** > **Networking**, click **Generate Domain**.
2. Railway assigns a public URL (e.g., `https://billbook-api-production.up.railway.app`).

---

## 4. Supabase Postgres Setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase Dashboard, open **SQL Editor**:
   - Execute `supabase/schema.sql` to initialize tables, indexes, and `party_balances` view.
   - Execute `supabase/seed.sql` to load demo parties and transactions.
3. In **Project Settings** > **Database**:
   - Copy the **Connection URI** (Connection pooling or Direct connection).
   - Append `?sslmode=require`.

---

## 5. Local Execution

### Option A: Local Python Environment
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your local PostgreSQL or Supabase DATABASE_URL
python wsgi.py
# Or with Gunicorn:
gunicorn --bind 0.0.0.0:5000 --workers 2 --threads 4 wsgi:app
```

### Option B: Docker Compose (Multi-container with Postgres)
```bash
cd backend
docker compose up --build
```
This launches:
- `api` on `http://localhost:5000`
- `db` on `localhost:5433` (PostgreSQL 16) with `schema.sql` and `seed.sql` pre-initialized.

---

## 6. Testing

Run the full automated test suite:
```bash
source backend/.venv/bin/activate
pytest backend/tests -v
```
All 76 automated test cases assert endpoint functionality, authentication, positive integer validation, soft deletion, hand-calculated financial metrics, and alert rules.

---

## 7. Free-Tier Sleeping Hosts & Warm-up Strategy

Free-tier cloud hosting providers (e.g., Render Free, Fly.io, Railway, or Koyeb) typically spin down containers to sleep after 15 minutes of inbound inactivity. A subsequent mobile request will encounter a **cold start delay of 30 to 50 seconds** while the Python container boots and initializes database connection pools.

### Recommended Warm-up Techniques:

1. **Scheduled Health Ping (Recommended for Free Render/Railway):**
   Configure a free uptime monitor (e.g., [UptimeRobot](https://uptimerobot.com), [Better Uptime](https://betteruptime.com), or [cron-job.org](https://cron-job.org)) to send an HTTP GET request to `/api/v1/health` every **10 to 14 minutes**:
   ```http
   GET https://your-app.onrender.com/api/v1/health HTTP/1.1
   ```
   - This endpoint requires no `X-API-Key` and responds in `<10ms` without performing heavy database queries.
   - Prevents the free host from falling asleep during shop business hours.

2. **Mobile App Launch Warm-up:**
   In the mobile app root (`mobile/App.tsx` or splash screen handler), issue an asynchronous background ping to `/api/v1/health` as soon as the app mounts. If the backend is asleep, this kicks off the wake-up sequence immediately while the splash screen or initial UI is rendering.

3. **Client-Side Timeout Tolerance:**
   Configure mobile network clients (Axios / Fetch) with a minimum timeout of **45 to 60 seconds** on the initial cold request to prevent false network failure screens while the container boots.
