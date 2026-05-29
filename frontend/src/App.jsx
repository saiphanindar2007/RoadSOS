import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";

import { useAuth }           from "./contexts/AuthContext";
import { supabase }          from "./lib/supabase";
import LoginPage             from "./pages/LoginPage";
import AdminDashboard        from "./pages/AdminDashboard";
import Header                from "./components/Header";
import SOSButton             from "./components/SOSButton";
import MapView               from "./components/MapView";
import ServicesList          from "./components/ServicesList";
import SeverityPredictor     from "./components/SeverityPredictor";
import StatsPanel            from "./components/StatsPanel";
import EmergencyModal        from "./components/EmergencyModal";
import VoiceSOS              from "./components/VoiceSOS";
import GoldenHourTimer       from "./components/GoldenHourTimer";
import MedicalIDCard         from "./components/MedicalIDCard";
import { useShakeDetect }    from "./hooks/useShakeDetect";

const API = "";

function distKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 +
               Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
               Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function mapType(amenity = "") {
  if (["hospital","clinic","doctors","nursing_home","health_centre"].includes(amenity)) return "hospital";
  if (amenity === "pharmacy")   return "pharmacy";
  if (amenity === "police")     return "police";
  if (["fire_station","ambulance_station"].includes(amenity)) return "fire";
  return "other";
}

function fmtDist(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function getMock(lat, lng) {
  return [
    { id:1,  name:"City Government Hospital",  amenity:"hospital",         phone:"108", opening_hours:"24/7",      dlat:0.012,  dlng:0.008  },
    { id:2,  name:"Apollo Multispeciality",     amenity:"hospital",         phone:"104", opening_hours:"24/7",      dlat:0.018,  dlng:0.005  },
    { id:3,  name:"District Govt Clinic",       amenity:"clinic",           phone:"104", opening_hours:"8AM-8PM",   dlat:0.006,  dlng:0.011  },
    { id:4,  name:"Sri Sai Nursing Home",       amenity:"nursing_home",     phone:null,  opening_hours:"24/7",      dlat:0.009,  dlng:-0.013 },
    { id:5,  name:"PHC Health Centre",          amenity:"health_centre",    phone:"104", opening_hours:"8AM-5PM",   dlat:-0.005, dlng:0.008  },
    { id:6,  name:"MedPlus Pharmacy",           amenity:"pharmacy",         phone:null,  opening_hours:"7AM-11PM",  dlat:0.004,  dlng:-0.011 },
    { id:7,  name:"Apollo Pharmacy",            amenity:"pharmacy",         phone:null,  opening_hours:"24/7",      dlat:0.014,  dlng:0.017  },
    { id:8,  name:"Police Control Room",        amenity:"police",           phone:"100", opening_hours:"24/7",      dlat:-0.009, dlng:0.014  },
    { id:9,  name:"Fire & Rescue Station",      amenity:"fire_station",     phone:"101", opening_hours:"24/7",      dlat:-0.016, dlng:-0.007 },
    { id:10, name:"Ambulance Dispatch Centre",  amenity:"ambulance_station",phone:"108", opening_hours:"24/7",      dlat:0.005,  dlng:-0.013 },
  ].map(p => {
    const sLat = lat + p.dlat, sLng = lng + p.dlng;
    const d    = distKm(lat, lng, sLat, sLng);
    return {
      id:p.id, name:p.name, amenity:p.amenity, type:mapType(p.amenity),
      lat:sLat, lng:sLng, distance:d, distance_text:fmtDist(d),
      phone:p.phone, opening_hours:p.opening_hours, address:null,
    };
  }).sort((a,b) => a.distance - b.distance);
}

const AMENITY_MAP = {
  all:      "hospital|clinic|doctors|nursing_home|health_centre|pharmacy|police|fire_station|ambulance_station",
  hospital: "hospital|clinic|doctors|nursing_home|health_centre",
  police:   "police",
  fire:     "fire_station|ambulance_station",
  pharmacy: "pharmacy",
};

async function fetchFromOverpass(lat, lng, f = "all") {
  const amenities = AMENITY_MAP[f] || AMENITY_MAP.all;
  const query = `[out:json][timeout:20];(node["amenity"~"${amenities}"](around:5000,${lat},${lng});way["amenity"~"${amenities}"](around:5000,${lat},${lng}););out center;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:`data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const svcs = (json.elements||[]).map(el => {
    const tags = el.tags||{};
    const elat = el.type==="node" ? el.lat : el.center?.lat;
    const elng = el.type==="node" ? el.lon : el.center?.lon;
    if (!elat||!elng) return null;
    const d    = distKm(lat, lng, elat, elng);
    return {
      id:el.id, name:tags.name||tags["name:en"]||tags["name:te"]||"Emergency Service",
      amenity:tags.amenity, type:mapType(tags.amenity),
      lat:elat, lng:elng, distance:d, distance_text:fmtDist(d),
      phone:tags.phone||tags["contact:phone"]||null,
      opening_hours:tags.opening_hours||"24/7",
      address:[tags["addr:street"],tags["addr:suburb"],tags["addr:city"]].filter(Boolean).join(", ")||null,
    };
  }).filter(Boolean).sort((a,b)=>a.distance-b.distance);
  return svcs;
}

// ─────────────────────────────────────────────────────────
const PAGE = {
  initial:{opacity:0,y:18}, animate:{opacity:1,y:0},
  exit:{opacity:0,y:-12},   transition:{duration:0.28},
};
const WATCH_OPTS = { enableHighAccuracy:true, maximumAge:4000, timeout:15000 };
const REFETCH_KM = 0.25;

// ── GPS Permission Banner ─────────────────────────────────
function GPSBanner({ onLocationGranted }) {
  const [req, setReq] = useState(false);

  const request = () => {
    setReq(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setReq(false);
        onLocationGranted({ lat: coords.latitude, lng: coords.longitude });
      },
      () => {
        setReq(false);
        alert("GPS access denied. Please enable location in your browser/device settings, then refresh.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  return (
    <div className="mx-4 mt-3 flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-amber-400">📍 Using default location (Hyderabad)</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Services shown around Hyderabad centre — not your real location.
          Allow GPS for accurate nearby results.
        </p>
      </div>
      <button
        onClick={request}
        disabled={req}
        className="flex-shrink-0 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
      >
        {req ? "⏳ Waiting…" : "📍 Allow GPS"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
export default function App() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();

  const [tab,             setTab]             = useState("map");
  const [location,        setLocation]        = useState(null);
  const [locationErr,     setLocationErr]     = useState(false);
  const [locationAccuracy,setLocationAccuracy]= useState(null);
  const [services,        setServices]        = useState([]);
  const [loadingSvc,      setLoadingSvc]      = useState(false);
  const [filter,          setFilter]          = useState("all");
  const [severityResult,  setSeverityResult]  = useState(null);
  const [stats,           setStats]           = useState(null);
  const [modal,           setModal]           = useState(false);
  const [selectedSvc,     setSelectedSvc]     = useState(null);

  const [goldenHourStart,  setGoldenHourStart]  = useState(null);
  const [goldenElapsed,    setGoldenElapsed]     = useState(0);
  const [goldenHourActive, setGoldenHourActive]  = useState(false);

  const timerRef        = useRef(null);
  const watchRef        = useRef(null);
  const lastFetchLocRef = useRef(null);
  const filterRef       = useRef(filter);
  useEffect(() => { filterRef.current = filter; }, [filter]);

  // ── Golden hour tick ──────────────────────────────────
  useEffect(() => {
    if (!goldenHourStart) return;
    timerRef.current = setInterval(() => {
      const e = Math.floor((Date.now()-goldenHourStart)/1000);
      setGoldenElapsed(e);
      if (e >= 3600) clearInterval(timerRef.current);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [goldenHourStart]);

  // ── Service fetcher ───────────────────────────────────
  const fetchServices = useCallback(async (lat, lng, f="all") => {
    setLoadingSvc(true);
    try {
      const svcs = await fetchFromOverpass(lat, lng, f);
      setServices(svcs.length > 0 ? svcs : getMock(lat, lng));
    } catch {
      setServices(getMock(lat, lng));
    } finally {
      setLoadingSvc(false);
    }
  }, []);

  // ── Handler when user manually grants GPS ─────────────
  const handleLocationGranted = useCallback((loc) => {
    setLocation(loc);
    setLocationErr(false);
    lastFetchLocRef.current = loc;
    fetchServices(loc.lat, loc.lng, filterRef.current);
    // Stop old watch + start new one from granted position
    if (watchRef.current != null)
      navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const nl = { lat:coords.latitude, lng:coords.longitude };
        setLocation(nl);
        setLocationAccuracy(Math.round(coords.accuracy));
        const moved = lastFetchLocRef.current
          ? distKm(lastFetchLocRef.current.lat, lastFetchLocRef.current.lng, nl.lat, nl.lng)
          : 999;
        if (moved >= REFETCH_KM) {
          fetchServices(nl.lat, nl.lng, filterRef.current);
          lastFetchLocRef.current = nl;
        }
      },
      () => {},
      WATCH_OPTS
    );
  }, [fetchServices]);

  // ── Initial watchPosition ─────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      const fb = { lat:17.3850, lng:78.4867 };
      setLocation(fb); setLocationErr(true);
      fetchServices(fb.lat, fb.lng, "all");
      lastFetchLocRef.current = fb;
      return;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const loc = { lat:coords.latitude, lng:coords.longitude };
        setLocation(loc);
        setLocationAccuracy(Math.round(coords.accuracy));
        setLocationErr(false);
        if (!lastFetchLocRef.current) {
          fetchServices(loc.lat, loc.lng, filterRef.current);
          lastFetchLocRef.current = loc;
          return;
        }
        const moved = distKm(lastFetchLocRef.current.lat, lastFetchLocRef.current.lng, loc.lat, loc.lng);
        if (moved >= REFETCH_KM) {
          fetchServices(loc.lat, loc.lng, filterRef.current);
          lastFetchLocRef.current = loc;
        }
      },
      () => {
        if (!lastFetchLocRef.current) {
          const fb = { lat:17.3850, lng:78.4867 };
          setLocation(fb); setLocationErr(true);
          fetchServices(fb.lat, fb.lng, "all");
          lastFetchLocRef.current = fb;
        }
      },
      WATCH_OPTS
    );
    return () => {
      if (watchRef.current != null)
        navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [fetchServices]);

  // ── Analytics ─────────────────────────────────────────
  useEffect(() => {
    axios.get(`${API}/api/accident-stats`)
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  // ── SOS ───────────────────────────────────────────────
  const openSOS = useCallback(async () => {
    setSelectedSvc(null); setModal(true);
    if (!goldenHourStart) { setGoldenHourStart(Date.now()); setGoldenHourActive(true); }
    if (user && location) {
      supabase.from("sos_events")
        .insert({ user_id:user.id, lat:location.lat, lng:location.lng })
        .then(({ error }) => { if (error) console.warn(error.message); });
    }
  }, [goldenHourStart, user, location]);

  useShakeDetect(openSOS);

  const handleFilter = f => {
    setFilter(f); filterRef.current = f;
    if (location) fetchServices(location.lat, location.lng, f);
  };

  const openService = svc => {
    setSelectedSvc(svc); setModal(true);
    if (!goldenHourStart) { setGoldenHourStart(Date.now()); setGoldenHourActive(true); }
  };

  const handlePredResult = useCallback(async (result, inputData) => {
    setSeverityResult(result);
    if (user) {
      supabase.from("ai_predictions")
        .insert({ user_id:user.id, input_data:inputData||{}, predicted_severity:result.severity_label, confidence:result.confidence })
        .then(({ error }) => { if (error) console.warn(error.message); });
    }
  }, [user]);

  // ── Auth guards ───────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-xl animate-pulse">🚨</div>
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    );
  }
  if (!user) return <LoginPage />;

  // ── Tabs — admin tab only appears when isAdmin === true ──
  const TABS = [
    { id:"map",      label:"🗺️ Live Map"   },
    { id:"services", label:"🚑 Services"   },
    { id:"predict",  label:"🤖 AI Predict" },
    { id:"stats",    label:"📊 Analytics"  },
    { id:"medid",    label:"🪪 Medical ID" },
    ...(isAdmin ? [{ id:"admin", label:"👑 Admin" }] : []),
  ];

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Header onSOS={openSOS} locationErr={locationErr} accuracy={locationAccuracy} onSignOut={signOut} />

      {/* GPS banner — shows only when using default location */}
      {locationErr && (
        <GPSBanner onLocationGranted={handleLocationGranted} />
      )}

      <SOSButton  onClick={openSOS} />
      <VoiceSOS   onTrigger={openSOS} />

      <AnimatePresence>
        {goldenHourActive && !modal && (
          <GoldenHourTimer goldenElapsed={goldenElapsed} active={goldenHourActive}
            onClose={() => setGoldenHourActive(false)} />
        )}
      </AnimatePresence>

      <nav className="sticky top-16 z-30 bg-surface-800/90 backdrop-blur-md border-b border-slate-700/50">
        <div className="flex overflow-x-auto scrollbar-hide max-w-6xl mx-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-5 py-3.5 text-sm font-medium transition-all border-b-2 font-display ${
                tab === t.id
                  ? "border-red-500 text-red-400 bg-red-500/10"
                  : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {tab === "map" && (
            <motion.div key="map" {...PAGE}>
              <MapView location={location} services={services} filter={filter}
                onFilterChange={handleFilter} onSelectService={openService} loading={loadingSvc} />
            </motion.div>
          )}
          {tab === "services" && (
            <motion.div key="services" {...PAGE}>
              <ServicesList services={services} loading={loadingSvc} filter={filter}
                onFilterChange={handleFilter} onSelect={openService} />
            </motion.div>
          )}
          {tab === "predict" && (
            <motion.div key="predict" {...PAGE}>
              <SeverityPredictor onResult={handlePredResult} result={severityResult}
                topServices={services.slice(0,3)} onCallService={openService} />
            </motion.div>
          )}
          {tab === "stats" && (
            <motion.div key="stats" {...PAGE}>
              <StatsPanel stats={stats} />
            </motion.div>
          )}
          {tab === "medid" && (
            <motion.div key="medid" {...PAGE}>
              <div className="max-w-2xl space-y-6">
                <h2 className="text-xl font-bold font-display text-white">🪪 Emergency Medical ID</h2>
                <MedicalIDCard />
              </div>
            </motion.div>
          )}
          {/* Admin tab — only renders when isAdmin === true */}
          {tab === "admin" && isAdmin && (
            <motion.div key="admin" {...PAGE}>
              <AdminDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {modal && (
          <EmergencyModal service={selectedSvc} services={services} result={severityResult}
            onClose={() => { setModal(false); setSelectedSvc(null); }} goldenElapsed={goldenElapsed} />
        )}
      </AnimatePresence>
    </div>
  );
}