import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles

# Ensure current directory and root are on sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import db
import matcher
from models import AuthReq, DriverRouteReq, MatchReq, BookReq, RideActionReq

app = FastAPI(title="RouteShare - Situational Mobility Platform")

# Initialize database tables and seed data
db.init_db()

# Resolve directories (handling both local execution and Vercel serverless bundle paths)
STATIC_DIR = os.path.join(BASE_DIR, "static")
if not os.path.exists(STATIC_DIR):
    STATIC_DIR = os.path.join(os.getcwd(), "static")

TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
if not os.path.exists(TEMPLATES_DIR):
    TEMPLATES_DIR = os.path.join(os.getcwd(), "templates")

if os.path.exists(STATIC_DIR):
    try:
        app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    except Exception:
        pass

@app.get("/static/{file_path:path}")
def serve_static(file_path: str):
    """Fallback static file server for CSS/JS."""
    candidate_paths = [
        os.path.join(STATIC_DIR, file_path),
        os.path.join(os.getcwd(), "static", file_path),
        os.path.join(BASE_DIR, "static", file_path)
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            return FileResponse(p)
    return {"error": "File not found"}

@app.get("/", response_class=HTMLResponse)
def home():
    """Serves the main application UI."""
    candidate_paths = [
        os.path.join(TEMPLATES_DIR, "index.html"),
        os.path.join(os.getcwd(), "templates", "index.html"),
        os.path.join(BASE_DIR, "templates", "index.html")
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            return FileResponse(p)
    return HTMLResponse("<h2>RouteShare UI template not found</h2>", status_code=404)

@app.post("/api/auth")
def auth(r: AuthReq):
    return db.auth(r.username.strip(), r.password, r.role, r.is_signup)

@app.post("/api/driver/route")
def save_driver_route(d: DriverRouteReq):
    db.save_route(
        name=d.name,
        vehicle=d.vehicle,
        seats=d.seats,
        time_str=d.time,
        o_name=d.origin_name,
        d_name=d.dest_name,
        s={"lat": d.start.lat, "lng": d.start.lng},
        e={"lat": d.end.lat, "lng": d.end.lng}
    )
    return {"status": "ok"}

@app.post("/api/match")
def match_ride(d: MatchReq):
    pickup = {"lat": d.pickup.lat, "lng": d.pickup.lng}
    dropoff = {"lat": d.dropoff.lat, "lng": d.dropoff.lng}
    drivers = db.get_drivers()
    matches = [
        m for m in (matcher.check_match(drv, pickup, dropoff) for drv in drivers)
        if m is not None
    ]
    if matches:
        return {"matched": True, "matches": sorted(matches, key=lambda x: x["detour_km"])}
    return {"matched": False}

@app.post("/api/book")
def book_ride(d: BookReq):
    ride_id = db.book_ride(
        rider=d.rider,
        driver=d.driver,
        o_name=d.origin_name,
        d_name=d.dest_name,
        fare=d.fare,
        detour=d.detour
    )
    return {"ride_id": ride_id, "status": "ok"}

@app.post("/api/ride/action")
def update_ride_status(d: RideActionReq):
    db.update_ride(d.id, d.status)
    return {"status": "ok"}

@app.get("/api/analytics")
def get_analytics():
    return db.get_analytics()

@app.get("/api/records")
def get_records():
    return db.get_all_records()

@app.get("/api/db/download")
def download_db():
    if os.path.exists(db.DB_PATH):
        return FileResponse(db.DB_PATH, filename="routeshare.db")
    return {"error": "Database not found"}

@app.post("/api/reset")
def reset_db():
    db.reset()
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("mobility_app:app", host="127.0.0.1", port=8000, reload=True)
