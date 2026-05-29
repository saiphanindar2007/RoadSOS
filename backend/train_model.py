"""
RoadSoS — Accident Severity ML Model Training
Run: python train_model.py
Trains a Random Forest on synthetic accident features (Kaggle-style).
Features mirror the UK/India Road Safety dataset structure.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib
import os

print("=" * 55)
print("  RoadSoS — Accident Severity Model Training")
print("=" * 55)

np.random.seed(42)
N = 15000  # samples

# ── Feature Engineering (10 features) ─────────────────────
road_type        = np.random.choice([0,1,2,3], N, p=[0.5,0.3,0.15,0.05])
speed_limit      = np.random.choice([20,30,40,50,60,70,80,100], N,
                                    p=[0.05,0.15,0.2,0.25,0.18,0.1,0.05,0.02])
weather          = np.random.choice([0,1,2,3,4], N, p=[0.55,0.27,0.08,0.07,0.03])
road_surface     = np.random.choice([0,1,2,3], N, p=[0.62,0.27,0.08,0.03])
light_conditions = np.random.choice([0,1,2], N, p=[0.52,0.25,0.23])
vehicle_type     = np.random.choice([0,1,2,3,4], N, p=[0.43,0.27,0.1,0.1,0.1])
num_vehicles     = np.random.randint(1, 7, N)
time_of_day      = np.random.choice([0,1,2,3], N, p=[0.25,0.30,0.25,0.20])
junction_detail  = np.random.choice([0,1,2,3], N, p=[0.40,0.15,0.25,0.20])
pedestrians      = np.random.choice([0,1], N, p=[0.78,0.22])

# ── Severity Score (domain-knowledge formula) ─────────────
severity_score = (
    (speed_limit / 30.0) * 1.5 +          # speed is the #1 factor
    weather * 0.45 +                        # bad weather increases risk
    road_surface * 0.55 +                   # slippery roads
    light_conditions * 0.70 +              # night driving
    (vehicle_type == 1).astype(float) * 0.90 +  # motorcycles = high risk
    (vehicle_type == 4).astype(float) * 0.40 +  # bicycles = moderate risk
    pedestrians * 1.60 +                    # pedestrians make it worse
    (road_type == 0).astype(float) * 0.20 +     # single carriageway
    (time_of_day == 3).astype(float) * 0.55 +   # night
    (junction_detail > 0).astype(float) * 0.35 + # junction = higher risk
    num_vehicles * 0.15
)

# Add realistic noise
noise = np.random.normal(0, 0.6, N)
severity_score += noise

# Map continuous score → 3 classes
severity = np.zeros(N, dtype=int)
severity[severity_score > 4.0] = 1   # Serious
severity[severity_score > 6.5] = 2   # Fatal

print(f"\n📊 Class Distribution:")
labels = ["Slight", "Serious", "Fatal"]
for i, lbl in enumerate(labels):
    count = (severity == i).sum()
    pct   = count / N * 100
    print(f"   {lbl:<10}: {count:>5} ({pct:.1f}%)")

# ── Build Feature Matrix ───────────────────────────────────
X = np.column_stack([
    road_type, speed_limit, weather, road_surface,
    light_conditions, vehicle_type, num_vehicles,
    time_of_day, junction_detail, pedestrians
])

FEATURE_NAMES = [
    "road_type", "speed_limit", "weather", "road_surface",
    "light_conditions", "vehicle_type", "num_vehicles",
    "time_of_day", "junction_detail", "pedestrians_involved"
]

# ── Train / Test Split ─────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, severity, test_size=0.20, random_state=42, stratify=severity
)

# ── Scale Features ─────────────────────────────────────────
scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc  = scaler.transform(X_test)

# ── Train Random Forest ────────────────────────────────────
print("\n🌲 Training Random Forest Classifier...")
model = RandomForestClassifier(
    n_estimators=250,
    max_depth=14,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)
model.fit(X_train_sc, y_train)

# ── Evaluate ───────────────────────────────────────────────
y_pred   = model.predict(X_test_sc)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n✅ Test Accuracy : {accuracy * 100:.1f}%")
print("\n📋 Classification Report:")
print(classification_report(y_test, y_pred, target_names=labels))

# Feature importance
print("🔍 Top Feature Importances:")
importances = sorted(
    zip(FEATURE_NAMES, model.feature_importances_),
    key=lambda x: x[1], reverse=True
)
for feat, imp in importances[:5]:
    bar = "█" * int(imp * 60)
    print(f"   {feat:<25} {bar} {imp:.3f}")

# ── Save Model ─────────────────────────────────────────────
os.makedirs("model", exist_ok=True)
joblib.dump(model,  "model/severity_model.pkl")
joblib.dump(scaler, "model/scaler.pkl")

print("\n✅ Model  → model/severity_model.pkl")
print("✅ Scaler → model/scaler.pkl")
print("\n🚀 Now run:  uvicorn main:app --reload --port 8000")
print("=" * 55)