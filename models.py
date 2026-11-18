from pydantic import BaseModel
from typing import Optional, Dict

class AuthReq(BaseModel):
    username: str
    password: str
    role: str = "rider"
    is_signup: bool = False

class Point(BaseModel):
    lat: float
    lng: float

class DriverRouteReq(BaseModel):
    name: str
    vehicle: Optional[str] = "Car"
    seats: Optional[int] = 3
    time: Optional[str] = "09:00 AM"
    origin_name: Optional[str] = "Start"
    dest_name: Optional[str] = "End"
    start: Point
    end: Point

class MatchReq(BaseModel):
    pickup: Point
    dropoff: Point

class BookReq(BaseModel):
    rider: str
    driver: str
    origin_name: Optional[str] = "Pickup"
    dest_name: Optional[str] = "Dropoff"
    fare: float
    detour: float

class RideActionReq(BaseModel):
    id: int
    status: str
