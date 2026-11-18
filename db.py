import sqlite3
import os
import hashlib

DB_PATH = os.path.join("/tmp" if os.environ.get("VERCEL") else os.path.dirname(os.path.abspath(__file__)), "routeshare.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                username TEXT UNIQUE,
                password_hash TEXT,
                role TEXT,
                rating REAL DEFAULT 4.9
            );
            CREATE TABLE IF NOT EXISTS driver_routes (
                id INTEGER PRIMARY KEY,
                driver_name TEXT,
                vehicle TEXT,
                seats INTEGER,
                time TEXT,
                origin_name TEXT,
                dest_name TEXT,
                s_lat REAL,
                s_lng REAL,
                e_lat REAL,
                e_lng REAL
            );
            CREATE TABLE IF NOT EXISTS rides (
                id INTEGER PRIMARY KEY,
                rider_name TEXT,
                driver_name TEXT,
                origin_name TEXT,
                dest_name TEXT,
                fare REAL,
                detour_km REAL,
                co2_saved REAL,
                status TEXT DEFAULT 'Completed'
            );
        """)
        if conn.execute("SELECT COUNT(*) FROM driver_routes").fetchone()[0] == 0:
            drivers = [
                ("Rahul Sharma", "Tata Nexon EV", 3, "08:30 AM", "Gurugram Cyber City", "Connaught Place", 28.4950, 77.0890, 28.6315, 77.2167),
                ("Amit Verma", "Honda City", 2, "09:15 AM", "Noida Sector 62", "South Extension", 28.6280, 77.3649, 28.5684, 77.2212),
                ("Sneha Patel", "Hyundai i20", 3, "09:00 AM", "Dwarka Sector 21", "Aerocity Delhi", 28.5522, 77.0583, 28.5492, 77.1213),
                ("Vikram Singh", "Maruti Brezza", 4, "08:45 AM", "Rohini Sector 14", "Rajiv Chowk", 28.7180, 77.1260, 28.6328, 77.2197)
            ]
            conn.executemany(
                "INSERT INTO driver_routes (driver_name, vehicle, seats, time, origin_name, dest_name, s_lat, s_lng, e_lat, e_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                drivers
            )
            rides = [
                ("Priya Nair", "Rahul Sharma", "Dhaula Kuan", "Shivaji Stadium", 140.0, 1.2, 3.4, "Completed"),
                ("Rohan Gupta", "Amit Verma", "Akshardham", "Lajpat Nagar", 120.0, 1.8, 2.6, "Completed"),
                ("Ananya Roy", "Sneha Patel", "Dwarka Mor", "Mahipalpur", 90.0, 0.9, 2.1, "Accepted"),
                ("Mohit Kumar", "Vikram Singh", "Pitampura", "Karol Bagh", 110.0, 1.5, 2.8, "Pending")
            ]
            conn.executemany(
                "INSERT INTO rides (rider_name, driver_name, origin_name, dest_name, fare, detour_km, co2_saved, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                rides
            )

def hash_pw(p: str) -> str:
    return hashlib.sha256(p.encode()).hexdigest()

def auth(username: str, password: str, role: str, is_signup: bool):
    with get_db() as conn:
        h = hash_pw(password)
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if is_signup:
            if row:
                return {"success": False, "error": "Username taken"}
            conn.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", (username, h, role))
            return {"success": True, "user": {"username": username, "role": role}}
        if not row or (row["password_hash"] and row["password_hash"] != h):
            return {"success": False, "error": "Invalid credentials"}
        return {"success": True, "user": {"username": row["username"], "role": row["role"]}}

def save_route(name: str, vehicle: str, seats: int, time_str: str, o_name: str, d_name: str, s: dict, e: dict):
    with get_db() as conn:
        conn.execute("DELETE FROM driver_routes WHERE driver_name = ?", (name,))
        conn.execute(
            "INSERT INTO driver_routes (driver_name, vehicle, seats, time, origin_name, dest_name, s_lat, s_lng, e_lat, e_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (name, vehicle, seats, time_str, o_name, d_name, s["lat"], s["lng"], e["lat"], e["lng"])
        )

def get_drivers():
    with get_db() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM driver_routes").fetchall()]

def book_ride(rider: str, driver: str, o_name: str, d_name: str, fare: float, detour: float):
    with get_db() as conn:
        return conn.execute(
            "INSERT INTO rides (rider_name, driver_name, origin_name, dest_name, fare, detour_km, co2_saved, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')",
            (rider, driver, o_name, d_name, fare, detour, round(fare * 0.02, 1))
        ).lastrowid

def update_ride(ride_id: int, status: str):
    with get_db() as conn:
        conn.execute("UPDATE rides SET status = ? WHERE id = ?", (status, ride_id))

def get_analytics():
    with get_db() as conn:
        t_rides = conn.execute("SELECT COUNT(*) FROM rides").fetchone()[0]
        co2 = conn.execute("SELECT COALESCE(SUM(co2_saved), 0) FROM rides").fetchone()[0]
        money = conn.execute("SELECT COALESCE(SUM(fare), 0) FROM rides").fetchone()[0]
        drivers = conn.execute("SELECT COUNT(*) FROM driver_routes").fetchone()[0]
        return {
            "total_rides": t_rides,
            "co2_saved_kg": round(co2 + 15.0, 1),
            "money_saved_inr": round(money * 1.8, 0),
            "active_drivers": drivers,
            "efficiency": "92.4%"
        }

def get_all_records():
    with get_db() as conn:
        return {
            "users": [dict(r) for r in conn.execute("SELECT id, username, role, rating FROM users").fetchall()],
            "driver_routes": [dict(r) for r in conn.execute("SELECT * FROM driver_routes").fetchall()],
            "rides": [dict(r) for r in conn.execute("SELECT * FROM rides ORDER BY id DESC").fetchall()]
        }

def reset():
    with get_db() as conn:
        conn.executescript("DELETE FROM rides; DELETE FROM driver_routes; DELETE FROM users;")
        init_db()
