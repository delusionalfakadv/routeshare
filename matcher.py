import math

def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates the great-circle distance between two points on the Earth (in km)."""
    dlat, dlng = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2)**2
    return round(6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)

def check_match(d: dict, p: dict, drop: dict, max_detour: float = 4.0):
    """
    Checks if a rider commute (p -> drop) matches a driver's route (s -> e).
    Calculates extra detour distance and returns overlap metrics if within max_detour tolerance.
    """
    d_driver = haversine(d["s_lat"], d["s_lng"], d["e_lat"], d["e_lng"])
    r_dist = haversine(p["lat"], p["lng"], drop["lat"], drop["lng"])
    
    detour = (
        haversine(d["s_lat"], d["s_lng"], p["lat"], p["lng"])
        + r_dist
        + haversine(drop["lat"], drop["lng"], d["e_lat"], d["e_lng"])
    ) - d_driver
    
    added = round(detour, 2)
    if added <= max_detour:
        uber = round(max(100.0, r_dist * 24.0), 0)
        fare = round(max(45.0, r_dist * 11.0), 0)
        overlap = max(30, min(96, round((1 - (added / max(0.1, r_dist + added))) * 100, 1)))
        return {
            "driver_name": d["driver_name"],
            "vehicle": d["vehicle"],
            "seats": d["seats"],
            "time": d["time"],
            "origin_name": d["origin_name"],
            "dest_name": d["dest_name"],
            "detour_km": added,
            "overlap_pct": overlap,
            "fare": fare,
            "uber_price": uber,
            "savings": round(uber - fare, 0)
        }
    return None
