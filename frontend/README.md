# 🎨 RoadSoS Frontend

Frontend for RoadSoS — AI-Powered Emergency Response Platform.

Built using React, Vite, Tailwind CSS, and Google Maps API.

---

# 🚀 Tech Stack

* React 18
* Vite 5
* Tailwind CSS
* Framer Motion
* Google Maps JavaScript API
* Recharts
* Supabase SDK

---

# ✨ Frontend Features

* Live GPS tracking
* Nearby emergency services
* Interactive Google Maps
* AI prediction interface
* Voice SOS
* Shake detection
* Admin dashboard
* Analytics charts
* Responsive design

---

# 📁 Folder Structure

```text
frontend/
│
├── src/
├── public/
├── components/
├── pages/
├── hooks/
├── utils/
├── package.json
```

---

# ⚙️ Installation

```bash
npm install
```

---

# ▶️ Run Development Server

```bash
npm run dev
```

---

# 🏗️ Build Production

```bash
npm run build
```

---

# 🌐 Environment Variables

Create `.env` file:

```env
VITE_GOOGLE_MAPS_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
```

---

# 🗺️ Maps Integration

Uses Google Maps JavaScript API for:

* Live tracking
* Navigation
* Marker clustering
* Emergency services display

---

# 📡 API Communication

Frontend communicates with FastAPI backend using:

```text
/api/predict-severity
/api/nearby-services
/api/accident-stats
```

---

# 📱 Responsive Design

Optimized for:

* Mobile
* Tablet
* Desktop

---

# 🚀 Deployment

Hosted on Vercel with automatic GitHub CI/CD deployment.

---

# 📜 License

Hackathon project — educational use.
