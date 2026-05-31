# 🚨 RoadSoS — Road Save Our Souls

AI-Powered Emergency Response & Road Safety Intelligence Platform

Built for the **National Road Safety Hackathon 2026**
Theme: **AI in Road Safety**

---

## 📌 Overview

RoadSoS is an intelligent emergency response ecosystem designed to reduce fatalities during road accidents by improving response time during the **Golden Hour** — the first critical 60 minutes after a crash.

The platform combines:

* 🚑 Real-time nearby emergency services
* 🤖 AI accident severity prediction
* 📍 Live GPS tracking
* 📳 Shake-based crash detection
* 🎙️ Voice-activated SOS
* 📊 Analytics dashboard
* 👑 Admin monitoring system
* 🌧️ Live weather risk analysis

RoadSoS aims to provide instant emergency assistance using AI, real-time mapping, and smart automation.

---

# 🏗️ System Architecture

```text
Frontend (React + Vite)
        ↓
FastAPI Backend (Railway)
        ↓
Supabase PostgreSQL + Realtime
        ↓
External APIs
(Google Maps, OpenStreetMap, Open-Meteo)
```

---

# 🚀 Live Deployment

## Frontend

https://roadsos-bay.vercel.app/

## Backend

https://roadsos-production-62ce.up.railway.app

---

# 🛠️ Tech Stack

| Layer          | Technology            |
| -------------- | --------------------- |
| Frontend       | React 18 + Vite       |
| Styling        | Tailwind CSS          |
| Animation      | Framer Motion         |
| Maps           | Google Maps API       |
| Backend        | FastAPI (Python 3.11) |
| ML             | scikit-learn          |
| Database       | Supabase PostgreSQL   |
| Authentication | Supabase Auth         |
| Hosting        | Vercel + Railway      |

---

# 🤖 AI & Machine Learning

## Model Used

Random Forest Classifier

## Dataset

15,000 synthetic accident samples generated using road safety domain knowledge.

## Features Used

* Road Type
* Speed Limit
* Weather
* Road Surface
* Light Conditions
* Vehicle Type
* Number of Vehicles
* Time of Day
* Junction Type
* Pedestrian Involvement

## Prediction Output

* Slight
* Serious
* Fatal

## Model Accuracy

~83%

---

# ✨ Features

## Emergency Features

* 🔴 One-tap SOS
* 🚑 Nearby emergency services
* 📞 Emergency quick dial
* ⏱️ Golden hour timer

## AI Features

* 🤖 AI severity prediction
* 📊 Smart service recommendations
* 📡 Road risk index

## Safety Features

* 📳 Shake-to-SOS
* 🎙️ Voice-activated SOS
* 🌧️ Weather-based road danger

## Admin Features

* 👑 Admin dashboard
* 📍 Live incident monitoring
* 📊 Analytics dashboard
* 🚨 Cluster detection

---

# 📊 Data Sources

| Data                | Source          |
| ------------------- | --------------- |
| Emergency Services  | OpenStreetMap   |
| Accident Statistics | MORTH 2024      |
| Maps                | Google Maps API |

---

# 📁 Project Structure

```text
RoadSoS/
│
├── frontend/
├── backend/
├── README.md
```

---

# ⚙️ Local Setup

## Clone Repository

```bash
git clone <repository-url>
cd RoadSoS
```

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

# 🌐 Environment Variables

## Frontend

```env
VITE_GOOGLE_MAPS_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
```

## Backend

```env
PORT=8000
```

---

# 📡 API Endpoints

| Endpoint              | Method | Description               |
| --------------------- | ------ | ------------------------- |
| /api/predict-severity | POST   | AI prediction             |
| /api/nearby-services  | GET    | Nearby emergency services |
| /api/accident-stats   | GET    | Analytics data            |
| /api/health           | GET    | Backend health            |

---

# 🔐 Authentication

RoadSoS uses Supabase Authentication with:

* Email/Password Login
* JWT Authentication
* Role-based Access

---

# 📈 Future Scope

* Real ambulance integration
* IoT crash sensors
* Government dashboard
* AI traffic forecasting
* Multilingual voice support

---

# 👨‍💻 Team

Built for the National Road Safety Hackathon 2026.

---

# 📜 License

This project is developed for educational and hackathon purposes.
