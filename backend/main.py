"""
RoadSoS — FastAPI Backend
Endpoints:
  GET  /                       health
  GET  /api/health             model status
  POST /api/predict-severity   AI severity prediction
  GET  /api/nearby-services    real services from OpenStreetMap
  GET  /api/accident-stats     analytics data
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import httpx
import math
import os
from typing import Optional

app = FastAPI(title="RoadSoS API", version="2.0.0", description="AI-powered Emergency Response")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model Loading ──────────────────────────────────────────
model  = None
scaler = None

@app.on_event("startup")
async def load_model():
    global model, scaler
    try:
        model  = joblib.load("model/severity_model.pkl")
        scaler = joblib.load("model/scaler.pkl")
        print("✅ ML Model loaded")
    except FileNotFoundError:
        print("⚠️  Model not found — run train_model.py first")

# ── Request Schemas ────────────────────────────────────────
class AccidentInput(BaseModel):
    road_type: int            # 0=single, 1=dual, 2=roundabout, 3=slip road
    speed_limit: int          # 20,30,40,50,60,70,80,100
    weather: int              # 0=fine,1=raining,2=fog,3=high winds,4=snow
    road_surface: int         # 0=dry,1=wet,2=ice/snow,3=flood
    light_conditions: int     # 0=daylight,1=dark lit,2=dark unlit
    vehicle_type: int         # 0=car,1=motorcycle,2=bus,3=truck,4=bicycle
    num_vehicles: int         # 1–6
    time_of_day: int          # 0=morning,1=afternoon,2=evening,3=night
    junction_detail: int      # 0=none,1=roundabout,2=t-junction,3=crossroads
    pedestrians_involved: int # 0=no,1=yes

# ── Constants ──────────────────────────────────────────────
SEVERITY_LABELS  = ["Slight",  "Serious",   "Fatal"  ]
SEVERITY_COLORS  = ["#f59e0b", "#ef4444",   "#7f1d1d"]
SEVERITY_EMOJI   = ["⚠️",      "🚨",        "🆘"     ]
SEVERITY_DESC = {
    0: "Minor injuries expected. First-aid may be sufficient. Consider calling an ambulance as a precaution.",
    1: "Serious injuries likely. Immediate medical intervention required. Call ambulance and police now.",
    2: "Life-threatening situation. Call ALL emergency services immediately. Do not move casualties."
}
RECOMMENDED = {
    0: ["ambulance"],
    1: ["ambulance", "hospital", "police"],
    2: ["ambulance", "hospital", "police", "fire"]
}

# ── Utility Functions ──────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat/2)**2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(d_lon/2)**2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def fmt_dist(km: float) -> str:
    return f"{int(km*1000)}m" if km < 1 else f"{km:.1f} km"

def build_addr(tags: dict) -> Optional[str]:
    parts = [tags.get(k,"") for k in
             ["addr:housenumber","addr:street","addr:suburb","addr:city"] if tags.get(k)]
    return ", ".join(parts) if parts else None

def map_type(amenity: str) -> str:
    return {"hospital":"hospital","clinic":"hospital","doctors":"hospital",
            "police":"police","fire_station":"fire",
            "pharmacy":"pharmacy"}.get(amenity, "other")

def mock_services(lat, lng):
    """Fallback data when Overpass API is unreachable."""
    return [
        {"id":1,"name":"City Government Hospital","type":"hospital","lat":lat+0.012,"lng":lng+0.008,
         "distance":1.5,"distance_text":"1.5 km","phone":"108","address":"Hospital Road","opening_hours":"24/7","emergency":"yes"},
        {"id":2,"name":"Police Control Room","type":"police","lat":lat-0.009,"lng":lng+0.014,
         "distance":1.8,"distance_text":"1.8 km","phone":"100","address":"Station Road","opening_hours":"24/7","emergency":None},
        {"id":3,"name":"Fire & Rescue Station","type":"fire","lat":lat-0.016,"lng":lng-0.007,
         "distance":2.2,"distance_text":"2.2 km","phone":"101","address":"Fire Station Road","opening_hours":"24/7","emergency":None},
        {"id":4,"name":"Trauma Care Centre","type":"hospital","lat":lat+0.021,"lng":lng-0.006,
         "distance":2.6,"distance_text":"2.6 km","phone":"104","address":"Health Campus Drive","opening_hours":"24/7","emergency":"yes"},
        {"id":5,"name":"Ambulance Dispatch","type":"hospital","lat":lat+0.005,"lng":lng-0.013,
         "distance":1.1,"distance_text":"1.1 km","phone":"108","address":"Medical Complex","opening_hours":"24/7","emergency":"yes"},
    ]

# ── Endpoints ──────────────────────────────────────────────
@app.get("/")
def root():
    return {"app":"RoadSoS","version":"2.0","status":"running"}

@app.get("/api/health")
def health():
    return {"status":"ok","model_loaded": model is not None}

@app.post("/api/predict-severity")
def predict_severity(data: AccidentInput):
    if model is None:
        raise HTTPException(503, "ML Model not loaded. Run: python train_model.py")

    X = np.array([[
        data.road_type, data.speed_limit, data.weather, data.road_surface,
        data.light_conditions, data.vehicle_type, data.num_vehicles,
        data.time_of_day, data.junction_detail, data.pedestrians_involved
    ]])

    X_sc      = scaler.transform(X)
    pred      = int(model.predict(X_sc)[0])
    proba     = model.predict_proba(X_sc)[0].tolist()
    conf      = float(max(proba)) * 100

    return {
        "severity":              pred,
        "severity_label":        SEVERITY_LABELS[pred],
        "severity_color":        SEVERITY_COLORS[pred],
        "severity_emoji":        SEVERITY_EMOJI[pred],
        "description":           SEVERITY_DESC[pred],
        "confidence":            round(conf, 1),
        "probabilities": {
            "slight":   round(proba[0]*100, 1),
            "serious":  round(proba[1]*100, 1),
            "fatal":    round(proba[2]*100, 1),
        },
        "recommended_services":  RECOMMENDED[pred],
    }

@app.get("/api/nearby-services")
async def nearby_services(
    lat: float, lng: float,
    radius: int = 5000,
    service_type: str = "all"
):
    type_map = {
        "hospital":    ["hospital","clinic","doctors"],
        "police":      ["police"],
        "fire":        ["fire_station"],
        "pharmacy":    ["pharmacy"],
        "all":         ["hospital","clinic","police","fire_station","pharmacy"],
    }
    amenities = type_map.get(service_type, type_map["all"])
    amenity_filter = "|".join(amenities)

    query = f"""
[out:json][timeout:25];
(
  node["amenity"~"{amenity_filter}"](around:{radius},{lat},{lng});
  way["amenity"~"{amenity_filter}"](around:{radius},{lat},{lng});
);
out center;
"""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": query}
            )
            osm = resp.json()

        services = []
        for el in osm.get("elements", []):
            tags  = el.get("tags", {})
            name  = tags.get("name") or tags.get("name:en") or "Emergency Service"
            am    = tags.get("amenity","other")
            if el["type"] == "node":
                elat, elng = el["lat"], el["lon"]
            else:
                elat = el.get("center",{}).get("lat", lat)
                elng = el.get("center",{}).get("lon", lng)

            dist = haversine(lat, lng, elat, elng)
            services.append({
                "id":           el["id"],
                "name":         name,
                "type":         map_type(am),
                "amenity":      am,
                "lat":          elat,
                "lng":          elng,
                "distance":     round(dist, 2),
                "distance_text": fmt_dist(dist),
                "phone":        tags.get("phone") or tags.get("contact:phone"),
                "address":      build_addr(tags),
                "opening_hours": tags.get("opening_hours", "24/7 Emergency"),
                "emergency":    tags.get("emergency"),
            })

        services.sort(key=lambda x: x["distance"])
        if not services:
            return {"services": mock_services(lat, lng), "count": 5, "source": "mock"}
        return {"services": services[:20], "count": len(services), "source": "OpenStreetMap"}

    except Exception as e:
        print(f"Overpass API error: {e} — using mock data")
        return {"services": mock_services(lat, lng), "count": 5, "source": "mock"}

@app.get("/api/accident-stats")
def accident_stats():
    return {
        "total_2024": 485000,
        "fatalities_2024": 172000,
        "injuries_2024": 460000,
        "daily_average": 1329,
        "hotspots": [
            {"state":"Tamil Nadu",      "accidents":64315},
            {"state":"Uttar Pradesh",   "accidents":42568},
            {"state":"Maharashtra",     "accidents":33789},
            {"state":"Karnataka",       "accidents":34156},
            {"state":"Rajasthan",       "accidents":28903},
            {"state":"Madhya Pradesh",  "accidents":54432},
        ],
        "peak_hours": [
            {"hour":"00–03","pct":6},  {"hour":"03–06","pct":4},
            {"hour":"06–09","pct":12}, {"hour":"09–12","pct":14},
            {"hour":"12–15","pct":13}, {"hour":"15–18","pct":18},
            {"hour":"18–21","pct":21}, {"hour":"21–24","pct":12},
        ],
        "causes": [
            {"cause":"Over Speeding",       "pct":43.5},
            {"cause":"Drunk Driving",       "pct":18.3},
            {"cause":"Wrong Side",          "pct":12.1},
            {"cause":"Red Light Jump",      "pct":8.7},
            {"cause":"Poor Road Condition", "pct":6.2},
            {"cause":"Others",              "pct":11.2},
        ],
        "vehicle_wise": [
            {"type":"Two-Wheelers","pct":36.6},
            {"type":"Cars/Jeeps",  "pct":21.8},
            {"type":"Trucks",      "pct":16.3},
            {"type":"Auto/Taxi",   "pct":9.4},
            {"type":"Buses",       "pct":6.8},
            {"type":"Others",      "pct":9.1},
        ]
    }