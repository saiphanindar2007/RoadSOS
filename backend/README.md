# ⚙️ RoadSoS Backend

FastAPI backend powering the RoadSoS emergency response ecosystem.

Handles:

* AI prediction
* Emergency services retrieval
* Analytics APIs
* Health monitoring

---

# 🚀 Tech Stack

* Python 3.11
* FastAPI
* scikit-learn
* Uvicorn
* Pandas
* NumPy

---

# 🤖 Machine Learning

## Model

Random Forest Classifier

## Prediction Classes

* Slight
* Serious
* Fatal

## Accuracy

~83%

---

# 📡 API Endpoints

## Health Check

```http
GET /
```

## Backend Status

```http
GET /api/health
```

## AI Severity Prediction

```http
POST /api/predict-severity
```

### Request Body

```json
{
  "road_type": 1,
  "speed_limit": 80,
  "weather": 1,
  "road_surface": 1,
  "light_conditions": 2,
  "vehicle_type": 1,
  "num_vehicles": 2,
  "time_of_day": 3,
  "junction_detail": 2,
  "pedestrians_involved": 1
}
```

---

## Nearby Emergency Services

```http
GET /api/nearby-services
```

### Query Parameters

```text
lat
lng
```

---

## Analytics Data

```http
GET /api/accident-stats
```

---

# ⚙️ Installation

## Create Virtual Environment

```bash
python -m venv venv
```

---

## Activate Environment

### Windows

```bash
venv\Scripts\activate
```

### Linux/Mac

```bash
source venv/bin/activate
```

---

## Install Dependencies

```bash
pip install -r requirements.txt
```

---

# ▶️ Run Server

```bash
uvicorn main:app --reload
```

---

# 🌐 Production Deployment

Hosted on Railway.

## Procfile

```text
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

# 📁 Project Structure

```text
backend/
│
├── main.py
├── model/
├── requirements.txt
├── Procfile
```

---

# 🧠 AI Model Details

## Hyperparameters

| Parameter    | Value    |
| ------------ | -------- |
| n_estimators | 250      |
| max_depth    | 14       |
| class_weight | balanced |

---

# 🔒 Security

* CORS enabled
* Input validation
* Structured API responses

---

# 🚀 Deployment

Backend deployed using Railway with automatic GitHub deployment.

---

# 📜 License

Hackathon project — educational use.
