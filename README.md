# RouteShare - Situational Mobility Platform

Peer-to-peer route overlap carpool platform utilizing spatial heuristics, Haversine detour matching, and SQLite persistence.

---

## 📁 Project Structure

```
ROUTESHARE/
├── api/
│   └── index.py           # Vercel serverless function entrypoint
├── mobility_app.py        # Main FastAPI application & API router
├── main.py                # Alternate server entrypoint
├── db.py                  # SQLite database manager, tables schema, & seed data
├── matcher.py             # Haversine distance math & route detour heuristic engine
├── models.py              # Pydantic data validation schemas
├── requirements.txt       # Project dependencies
├── vercel.json            # Vercel deployment configuration
├── .vercelignore          # Ignored files for Vercel builds
├── run_vercel.bat         # 1-click batch script to run Vercel CLI locally
├── deploy_vercel.bat      # 1-click batch script to deploy via Vercel CLI
├── templates/
│   └── index.html         # Main web application UI
└── static/
    ├── css/
    │   └── style.css      # Custom styling & scrollbar design
    └── js/
        └── app.js         # Leaflet map logic, auth, carpool feed, & DB inspector
```

---

## ⚡ Running with Vercel CLI

### 1. Run Locally (Development)
You have Vercel CLI installed. From the `ROUTESHARE` directory:

```bash
vercel dev
```
*(Or double-click `run_vercel.bat`)*

Vercel will start a local emulation server (typically at `http://localhost:3000`).

### 2. Deploy to Production
To deploy live to Vercel:

```bash
vercel --prod
```
*(Or double-click `deploy_vercel.bat`)*

---

## 🚀 Running with Python directly

```bash
pip install -r requirements.txt
python mobility_app.py
```
Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.
