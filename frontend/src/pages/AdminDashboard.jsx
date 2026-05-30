import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  GoogleMap, useJsApiLoader, Marker, InfoWindow, HeatmapLayer,
} from "@react-google-maps/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, LogOut, Download, AlertTriangle, Bell,
  TrendingUp, Users, Zap, Brain, MapPin, Shield,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

// ── constants ──────────────────────────────────────────────
const GMAPS_KEY  = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const LIBRARIES  = ["visualization"];

const PIE_COLORS = ["#f59e0b", "#ef4444", "#7f1d1d"];
const TT_STYLE   = {
  contentStyle:{ background:"#1e293b",border:"1px solid #334155",borderRadius:"8px",color:"#f1f5f9",fontSize:"11px" },
  labelStyle:  { color:"#94a3b8",fontSize:"10px" },
};

const DARK_MAP = [
  { elementType:"geometry",           stylers:[{ color:"#0f172a" }] },
  { elementType:"labels.text.fill",   stylers:[{ color:"#64748b" }] },
  { elementType:"labels.text.stroke", stylers:[{ color:"#0f172a" }] },
  { featureType:"road", elementType:"geometry", stylers:[{ color:"#1e293b" }] },
  { featureType:"road.highway", elementType:"geometry", stylers:[{ color:"#2d3f55" }] },
  { featureType:"water", elementType:"geometry", stylers:[{ color:"#071220" }] },
  { featureType:"administrative.locality", elementType:"labels.text.fill", stylers:[{ color:"#e2e8f0" }] },
];

// ── Incident cluster detection ─────────────────────────────
function detectClusters(events, radiusKm = 1, windowMin = 15) {
  const clusters = [];
  const now = Date.now();
  const windowMs = windowMin * 60 * 1000;
  const recent = events.filter(e => now - new Date(e.created_at).getTime() < windowMs);
  const used = new Set();
  for (let i = 0; i < recent.length; i++) {
    if (used.has(i)) continue;
    const group = [recent[i]];
    for (let j = i + 1; j < recent.length; j++) {
      if (used.has(j)) continue;
      const d = haversine(recent[i].lat, recent[i].lng, recent[j].lat, recent[j].lng);
      if (d <= radiusKm) { group.push(recent[j]); used.add(j); }
    }
    if (group.length >= 2) {
      clusters.push({
        id: i,
        lat: group.reduce((s,e) => s + e.lat, 0) / group.length,
        lng: group.reduce((s,e) => s + e.lng, 0) / group.length,
        count: group.length,
        events: group,
      });
      used.add(i);
    }
  }
  return clusters;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ── CSV export ─────────────────────────────────────────────
function downloadCSV(rows, filename) {
  const headers = Object.keys(rows[0] || {}).join(",");
  const body    = rows.map(r => Object.values(r).join(",")).join("\n");
  const blob    = new Blob([headers+"\n"+body], { type:"text/csv" });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <motion.div
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      className="glass rounded-2xl border border-slate-700/50 p-5 relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-5"
        style={{ background:`radial-gradient(circle at top right,${color},transparent 70%)` }} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">{label}</div>
          <div className="text-3xl font-bold font-display" style={{ color }}>{value}</div>
          {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
          {trend != null && (
            <div className={`text-[10px] mt-1.5 font-medium ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% vs yesterday
            </div>
          )}
        </div>
        <div className="text-2xl opacity-60">{icon}</div>
      </div>
    </motion.div>
  );
}

function SeverityBadge({ s }) {
  const cfg = {
    Slight:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Serious: "bg-red-500/15 text-red-400 border-red-500/30",
    Fatal:   "bg-red-950/40 text-red-300 border-red-900/50",
  };
  return (
    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${cfg[s]||"bg-slate-700 text-slate-400 border-slate-600"}`}>
      {s}
    </span>
  );
}

// ── Admin SOS Map ──────────────────────────────────────────
function AdminSOSMap({ sosEvents, clusters }) {
  const [active, setActive] = useState(null);
  const { isLoaded } = useJsApiLoader({ id:"google-map-script", googleMapsApiKey:GMAPS_KEY, libraries:LIBRARIES });

  const centre = sosEvents.length
    ? { lat: sosEvents[0].lat, lng: sosEvents[0].lng }
    : { lat: 17.3850, lng: 78.4867 };

  if (!isLoaded) return (
    <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading map…</div>
  );

  const now = Date.now();
  const isToday = (iso) => now - new Date(iso).getTime() < 86400000;

  const sosDot = (today) => ({
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: today ? 12 : 8,
    fillColor: today ? "#ef4444" : "#7f1d1d",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: today ? 2.5 : 1.5,
  });

  const clusterIcon = (count) => ({
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 16 + count * 3,
    fillColor: "#fbbf24",
    fillOpacity: 0.85,
    strokeColor: "#ffffff",
    strokeWeight: 3,
  });

  return (
    <GoogleMap
      mapContainerStyle={{ width:"100%", height:"100%" }}
      center={centre}
      zoom={12}
      options={{ styles:DARK_MAP, disableDefaultUI:false, mapTypeControl:false, streetViewControl:false, zoomControl:true }}
      onClick={() => setActive(null)}
    >
      {/* SOS event pins */}
      {sosEvents.slice(0,50).map(e => (
        <Marker key={e.id}
          position={{ lat:e.lat, lng:e.lng }}
          icon={sosDot(isToday(e.created_at))}
          title={`SOS: ${new Date(e.created_at).toLocaleString("en-IN")}`}
          onClick={() => setActive(e)}
          zIndex={isToday(e.created_at) ? 20 : 10}
        />
      ))}

      {/* Cluster markers */}
      {clusters.map(c => (
        <Marker key={`cl-${c.id}`}
          position={{ lat:c.lat, lng:c.lng }}
          icon={clusterIcon(c.count)}
          title={`⚠️ ${c.count} SOS events clustered here!`}
          zIndex={30}
          onClick={() => setActive({ ...c, isCluster:true })}
        />
      ))}

      {/* Info window */}
      {active && (
        <InfoWindow
          position={{ lat:active.lat, lng:active.lng }}
          onCloseClick={() => setActive(null)}
          options={{ pixelOffset: new window.google.maps.Size(0,-14) }}
        >
          <div style={{ background:"#1e293b",borderRadius:"10px",padding:"12px",minWidth:"190px",fontFamily:"system-ui,sans-serif" }}>
            {active.isCluster ? (
              <>
                <div style={{ color:"#fbbf24",fontWeight:"700",fontSize:"13px",marginBottom:"4px" }}>
                  🆘 Incident Cluster ({active.count} SOS)
                </div>
                <div style={{ color:"#94a3b8",fontSize:"11px" }}>
                  {active.events.map(e => (
                    <div key={e.id}>{new Date(e.created_at).toLocaleTimeString("en-IN")}</div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ color:"#fca5a5",fontWeight:"700",fontSize:"13px",marginBottom:"3px" }}>🆘 SOS Event</div>
                <div style={{ color:"#94a3b8",fontSize:"11px",marginBottom:"6px" }}>
                  {new Date(active.created_at).toLocaleString("en-IN")}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${active.lat},${active.lng}`}
                  target="_blank" rel="noreferrer"
                  style={{ color:"#60a5fa",fontSize:"11px" }}
                >
                  📍 View location
                </a>
              </>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("overview");
  const [users,       setUsers]       = useState([]);
  const [sosEvents,   setSosEvents]   = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [hazards,     setHazards]     = useState([]);
  const [stats,       setStats]       = useState({ users:0, sosTotal:0, sosToday:0, predictions:0, hazards:0 });
  const [sevDist,     setSevDist]     = useState([]);
  const [sosTimeline, setSosTimeline] = useState([]);
  const [hourlyDist,  setHourlyDist]  = useState([]);
  const [liveAlerts,  setLiveAlerts]  = useState([]);
  const [userSearch,  setUserSearch]  = useState("");
  const [clusters,    setClusters]    = useState([]);
  const liveCount = useRef(0);

  // ── Fetch all data ──────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: uData },
        { data: sData },
        { data: pData },
        { data: hData },
      ] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending:false }),
        supabase.from("sos_events").select("*").order("created_at", { ascending:false }).limit(200),
        supabase.from("ai_predictions").select("*").order("created_at", { ascending:false }).limit(200),
        supabase.from("hazard_reports").select("*").order("created_at", { ascending:false }).limit(100),
      ]);

      const now   = new Date();
      const today = now.toISOString().split("T")[0];
      const sd    = sData || [];
      const pd    = pData || [];
      const ud    = uData || [];

      setUsers(ud);
      setSosEvents(sd);
      setPredictions(pd);
      setHazards(hData || []);

      const sosToday = sd.filter(e => e.created_at.startsWith(today)).length;
      setStats({ users:ud.length, sosTotal:sd.length, sosToday, predictions:pd.length, hazards:(hData||[]).length });

      // Severity distribution
      const sevC = { Slight:0, Serious:0, Fatal:0 };
      pd.forEach(p => { if (p.predicted_severity in sevC) sevC[p.predicted_severity]++; });
      setSevDist([
        { name:"Slight", value:sevC.Slight },
        { name:"Serious", value:sevC.Serious },
        { name:"Fatal", value:sevC.Fatal },
      ]);

      // 7-day timeline
      const days = {};
      for (let i=6; i>=0; i--) {
        const d = new Date(now); d.setDate(d.getDate()-i);
        const key = d.toLocaleDateString("en-IN", { weekday:"short", day:"numeric" });
        days[key] = 0;
      }
      sd.forEach(e => {
        const key = new Date(e.created_at).toLocaleDateString("en-IN", { weekday:"short", day:"numeric" });
        if (key in days) days[key]++;
      });
      setSosTimeline(Object.entries(days).map(([day, count]) => ({ day, count })));

      // Hourly distribution
      const hours = Array.from({ length:24 }, (_,i) => ({ hour:`${i}:00`, count:0 }));
      sd.forEach(e => {
        const h = new Date(e.created_at).getHours();
        hours[h].count++;
      });
      setHourlyDist(hours);

      // Cluster detection (incidents)
      const foundClusters = detectClusters(sd);
      setClusters(foundClusters);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Realtime SOS subscription ──────────────────────────
  useEffect(() => {
    const ch = supabase.channel("admin_sos")
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"sos_events" }, payload => {
        liveCount.current++;
        const e = payload.new;
        setSosEvents(prev => [e, ...prev]);
        setStats(s => ({ ...s, sosTotal:s.sosTotal+1, sosToday:s.sosToday+1 }));
        const alert = {
          id:    Date.now(),
          msg:   `🆘 New SOS at ${new Date(e.created_at).toLocaleTimeString("en-IN")} — ${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}`,
          lat:   e.lat,
          lng:   e.lng,
        };
        setLiveAlerts(prev => [alert, ...prev.slice(0,4)]);
        // Re-run cluster detection
        setSosEvents(prev => {
          const updated = [e, ...prev];
          setClusters(detectClusters(updated));
          return updated;
        });
        setTimeout(() => setLiveAlerts(prev => prev.filter(a => a.id !== alert.id)), 8000);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // ── Export ─────────────────────────────────────────────
  const exportSOS = () => {
    const rows = sosEvents.map(e => ({
      id:e.id, lat:e.lat, lng:e.lng,
      user_id:e.user_id||"", created_at:e.created_at,
    }));
    downloadCSV(rows, "roadsos_sos_events.csv");
  };

  const exportPredictions = () => {
    const rows = predictions.map(p => ({
      id:p.id, severity:p.predicted_severity, confidence:p.confidence,
      created_at:p.created_at,
    }));
    downloadCSV(rows, "roadsos_ai_predictions.csv");
  };

  const toggleRole = async (userId, role) => {
    const nr = role==="admin" ? "user" : "admin";
    const { error } = await supabase.from("profiles").update({ role:nr }).eq("id", userId);
    if (!error) setUsers(prev => prev.map(u => u.id===userId ? { ...u, role:nr } : u));
  };

  const fmt  = iso => new Date(iso).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
  const fmtD = iso => new Date(iso).toLocaleDateString("en-IN");

  const TABS = [
    { id:"overview",    label:"📊 Overview"     },
    { id:"livemap",     label:"🗺️ Live Map"     },
    { id:"analytics",   label:"📈 Analytics"    },
    { id:"users",       label:"👥 Users"        },
    { id:"sos",         label:"🆘 SOS Events"   },
    { id:"predictions", label:"🤖 AI Logs"      },
    { id:"hazards",     label:"⚠️ Hazards"      },
  ];

  const filteredUsers = users.filter(u =>
    !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">

      {/* ── HEADER ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-surface-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-lg shadow-lg shadow-red-900/40">🚨</div>
            <div>
              <div className="font-bold font-display text-white text-sm leading-tight">
                RoadSoS <span className="text-red-400">Admin</span>
              </div>
              <div className="text-[9px] text-slate-500 uppercase tracking-widest">Command Centre · {profile?.email}</div>
            </div>
          </div>

          {/* Cluster alert */}
          {clusters.length > 0 && (
            <motion.div
              animate={{ opacity:[1,0.6,1] }}
              transition={{ repeat:Infinity, duration:1.2 }}
              className="hidden md:flex items-center gap-2 bg-red-900/30 border border-red-500/40 px-3 py-1.5 rounded-xl text-xs text-red-300 font-bold"
            >
              <AlertTriangle size={12} />
              {clusters.length} ACTIVE INCIDENT CLUSTER{clusters.length>1?"S":""}
            </motion.div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={fetchAll}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 rounded-lg transition-colors">
              <RefreshCw size={11} className={loading?"animate-spin":""} /> Refresh
            </button>
            <button onClick={exportSOS}
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 rounded-lg transition-colors">
              <Download size={11} /> Export
            </button>
            <button onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-slate-800 rounded-lg transition-colors">
              <LogOut size={11} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── LIVE ALERTS ────────────────────────────────── */}
      <AnimatePresence>
        {liveAlerts.map(a => (
          <motion.div key={a.id}
            initial={{ height:0, opacity:0 }}
            animate={{ height:"auto", opacity:1 }}
            exit={{ height:0, opacity:0 }}
            className="bg-red-700 text-white text-xs font-medium text-center py-2 px-4 flex items-center justify-center gap-2"
          >
            <Bell size={12} />
            {a.msg}
            <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`}
              target="_blank" rel="noreferrer"
              className="underline ml-1">
              Map
            </a>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── TAB BAR ───────────────────────────────────── */}
        <div className="flex gap-1.5 flex-wrap mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
                activeTab===t.id
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════ OVERVIEW ═══════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6">

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatCard icon="👥" label="Total Users"     value={stats.users}       color="#3b82f6" sub="registered" />
              <StatCard icon="🆘" label="SOS All Time"   value={stats.sosTotal}    color="#ef4444" sub="all time" />
              <StatCard icon="📅" label="SOS Today"      value={stats.sosToday}    color="#f97316" sub="last 24h" />
              <StatCard icon="🤖" label="AI Predictions" value={stats.predictions} color="#8b5cf6" sub="total" />
              <StatCard icon="⚠️" label="Hazard Reports" value={stats.hazards}     color="#f59e0b" sub="community" />
            </div>

            {/* Incident Cluster Warning */}
            {clusters.length > 0 && (
              <motion.div
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                className="rounded-2xl border border-red-500/40 p-4"
                style={{ background:"rgba(127,29,29,0.25)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-red-400" />
                  <h3 className="font-bold text-red-300 text-sm">
                    🚨 {clusters.length} Active Incident Cluster{clusters.length>1?"s":""} Detected
                  </h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {clusters.map((c,i) => (
                    <div key={i}
                      className="flex items-center justify-between bg-red-900/30 border border-red-800/40 rounded-xl px-3 py-2.5">
                      <div>
                        <div className="text-sm font-bold text-red-200">
                          {c.count} SOS events
                        </div>
                        <div className="text-xs text-red-400 font-mono">
                          {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${c.lat},${c.lng}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs bg-red-600 hover:bg-red-500 text-white px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        View →
                      </a>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Charts */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="glass rounded-2xl border border-slate-700/50 p-5">
                <h3 className="font-semibold font-display text-white text-sm mb-4">📈 SOS Events — Last 7 Days</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={sosTimeline}>
                    <defs>
                      <linearGradient id="sosGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" tick={{ fill:"#64748b", fontSize:10 }} />
                    <YAxis allowDecimals={false} tick={{ fill:"#64748b", fontSize:10 }} />
                    <Tooltip {...TT_STYLE} />
                    <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2.5}
                      fill="url(#sosGrad)" dot={{ r:4, fill:"#ef4444" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="glass rounded-2xl border border-slate-700/50 p-5">
                <h3 className="font-semibold font-display text-white text-sm mb-4">🤖 AI Severity Distribution</h3>
                {sevDist.some(d=>d.value>0) ? (
                  <div className="flex items-center gap-4">
                    <PieChart width={130} height={130}>
                      <Pie data={sevDist} cx={60} cy={60} innerRadius={36} outerRadius={58} dataKey="value">
                        {sevDist.map((_,i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={v=>[v,"Predictions"]} contentStyle={TT_STYLE.contentStyle} />
                    </PieChart>
                    <div className="space-y-2">
                      {sevDist.map((d,i) => (
                        <div key={d.name} className="flex items-center gap-2 text-sm">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background:PIE_COLORS[i] }} />
                          <span className="text-slate-300">{d.name}</span>
                          <span className="font-mono font-bold text-white ml-auto">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[130px] text-slate-500 text-sm">No AI predictions yet</div>
                )}
              </div>
            </div>

            {/* Recent SOS live feed */}
            <div className="glass rounded-2xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold font-display text-white text-sm flex items-center gap-2">
                  🆘 Live SOS Feed
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                </h3>
                <button onClick={exportSOS}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                  <Download size={11} /> CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60">
                      {["Time","User","Coordinates","Map","Status"].map(h => (
                        <th key={h} className="pb-2 pr-4 text-left text-[10px] font-mono uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sosEvents.slice(0,8).map(e => {
                      const u = users.find(u=>u.id===e.user_id);
                      const today = Date.now()-new Date(e.created_at).getTime() < 86400000;
                      return (
                        <tr key={e.id} className="border-b border-slate-800/60 hover:bg-white/2">
                          <td className="py-2 pr-4 text-slate-300 text-xs font-mono">{fmt(e.created_at)}</td>
                          <td className="py-2 pr-4 text-slate-300 text-xs">{u?.name||u?.email||"—"}</td>
                          <td className="py-2 pr-4 text-slate-400 text-xs font-mono">
                            {e.lat.toFixed(4)}, {e.lng.toFixed(4)}
                          </td>
                          <td className="py-2 pr-4">
                            <a href={`https://www.google.com/maps?q=${e.lat},${e.lng}`}
                              target="_blank" rel="noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 underline">
                              View
                            </a>
                          </td>
                          <td className="py-2">
                            {today
                              ? <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold font-mono">TODAY</span>
                              : <span className="text-[10px] text-slate-600 font-mono">OLD</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════ LIVE MAP ════════════════════════════════ */}
        {activeTab === "livemap" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold font-display text-white">🗺️ Live SOS Command Map</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Red markers = SOS events · Yellow = clustered incidents · Updates in real-time
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-slate-400">SOS Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-900" />
                  <span className="text-slate-400">SOS Older</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="text-slate-400">Cluster</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl" style={{ height:"520px" }}>
              <AdminSOSMap sosEvents={sosEvents} clusters={clusters} />
            </div>
            <div className="text-xs text-slate-500 text-right">
              Showing {Math.min(sosEvents.length, 50)} most recent SOS events ·
              {clusters.length > 0 ? ` ${clusters.length} active clusters` : " No active clusters"}
            </div>
          </div>
        )}

        {/* ══════ ANALYTICS ═══════════════════════════════ */}
        {activeTab === "analytics" && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold font-display text-white">📈 Deep Analytics</h2>

            {/* Hourly distribution */}
            <div className="glass rounded-2xl border border-slate-700/50 p-5">
              <h3 className="font-semibold font-display text-white text-sm mb-4">
                🕐 SOS Events by Hour of Day (All Time)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyDist} margin={{ left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" tick={{ fill:"#64748b", fontSize:9 }}
                    tickFormatter={v => v.split(":")[0]+"h"} interval={2} />
                  <YAxis allowDecimals={false} tick={{ fill:"#64748b", fontSize:10 }} />
                  <Tooltip {...TT_STYLE} />
                  <Bar dataKey="count" radius={[3,3,0,0]}>
                    {hourlyDist.map((_,i) => (
                      <Cell key={i} fill={i>=18||i<6 ? "#ef4444" : i>=6&&i<10 ? "#f97316" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 text-[10px] text-slate-500 mt-2">
                <span><span className="text-red-400">■</span> Night (6PM–6AM)</span>
                <span><span className="text-orange-400">■</span> Morning Rush</span>
                <span><span className="text-blue-400">■</span> Daytime</span>
              </div>
            </div>

            {/* Prediction breakdown */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label:"Slight", count:sevDist[0]?.value||0, color:"#f59e0b", pct: predictions.length ? ((sevDist[0]?.value||0)/predictions.length*100).toFixed(0) : 0 },
                { label:"Serious",count:sevDist[1]?.value||0, color:"#ef4444", pct: predictions.length ? ((sevDist[1]?.value||0)/predictions.length*100).toFixed(0) : 0 },
                { label:"Fatal",  count:sevDist[2]?.value||0, color:"#7f1d1d", pct: predictions.length ? ((sevDist[2]?.value||0)/predictions.length*100).toFixed(0) : 0 },
              ].map(s => (
                <div key={s.label} className="glass rounded-2xl border border-slate-700/50 p-5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">{s.label} Severity</div>
                  <div className="text-3xl font-bold font-display" style={{ color:s.color }}>{s.count}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.pct}% of all predictions</div>
                  <div className="h-1.5 bg-slate-700/60 rounded-full mt-3 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width:`${s.pct}%`, background:s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════ USERS ════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-display text-white">👥 Users ({users.length})</h2>
            </div>
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500/50 transition-colors"
            />
            <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60">
                      {["Name","Email","Role","SOS Count","Joined","Action"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-mono uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const userSOS = sosEvents.filter(e => e.user_id === u.id).length;
                      return (
                        <tr key={u.id} className="border-b border-slate-800/60 hover:bg-white/2">
                          <td className="px-4 py-3 text-white font-medium">{u.name||"—"}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                              u.role==="admin"
                                ? "bg-red-500/15 text-red-400 border-red-500/30"
                                : "bg-slate-700/60 text-slate-300 border-slate-600"
                            }`}>
                              {u.role==="admin" ? "🛡 ADMIN" : "👤 USER"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-mono font-bold ${userSOS > 0 ? "text-red-400" : "text-slate-500"}`}>
                              {userSOS}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs font-mono">{fmtD(u.created_at)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleRole(u.id, u.role)}
                              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-lg transition-colors">
                              → {u.role==="admin" ? "User" : "Admin"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════ SOS EVENTS ══════════════════════════════ */}
        {activeTab === "sos" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-display text-white">🆘 SOS Events ({sosEvents.length})</h2>
              <button onClick={exportSOS}
                className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg transition-colors">
                <Download size={12} /> Export CSV
              </button>
            </div>
            <div className="space-y-2">
              {sosEvents.map(e => {
                const u = users.find(u=>u.id===e.user_id);
                const isNew = Date.now()-new Date(e.created_at).getTime() < 3600000;
                return (
                  <div key={e.id}
                    className={`flex items-center justify-between border rounded-xl px-4 py-3 gap-3 flex-wrap transition-all ${
                      isNew
                        ? "bg-red-900/20 border-red-500/30"
                        : "bg-slate-800/40 border-slate-700/40"
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{isNew ? "🔴" : "🆘"}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{u?.name||u?.email||"Anonymous"}</div>
                        <div className="text-xs text-slate-400 font-mono">{fmt(e.created_at)}</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-400">{e.lat.toFixed(5)}, {e.lng.toFixed(5)}</div>
                    <a href={`https://www.google.com/maps?q=${e.lat},${e.lng}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                      🗺 Open in Maps
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════ AI PREDICTIONS ══════════════════════════ */}
        {activeTab === "predictions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-display text-white">🤖 AI Prediction Log ({predictions.length})</h2>
              <button onClick={exportPredictions}
                className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg transition-colors">
                <Download size={12} /> Export CSV
              </button>
            </div>
            <div className="space-y-2">
              {predictions.map(p => {
                const u = users.find(u=>u.id===p.user_id);
                return (
                  <div key={p.id}
                    className="flex items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🧠</span>
                      <div>
                        <div className="text-sm font-medium text-white">{u?.name||u?.email||"Anonymous"}</div>
                        <div className="text-xs text-slate-400 font-mono">{fmt(p.created_at)}</div>
                      </div>
                    </div>
                    <SeverityBadge s={p.predicted_severity} />
                    <div className="text-xs font-mono text-slate-400">{p.confidence?.toFixed(1)}% conf.</div>
                  </div>
                );
              })}
              {predictions.length===0 && <p className="text-center text-slate-500 text-sm py-8">No predictions yet</p>}
            </div>
          </div>
        )}

        {/* ══════ HAZARDS ═════════════════════════════════ */}
        {activeTab === "hazards" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-display text-white">⚠️ Community Hazard Reports ({hazards.length})</h2>
            {hazards.length === 0
              ? <p className="text-slate-500 text-sm py-8 text-center">No hazard reports yet — community will populate this</p>
              : (
                <div className="space-y-2">
                  {hazards.map(h => {
                    const u = users.find(u=>u.id===h.user_id);
                    const sev = { low:"text-green-400", medium:"text-amber-400", high:"text-red-400" };
                    return (
                      <div key={h.id}
                        className="flex items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">⚠️</span>
                          <div>
                            <div className="text-sm font-medium text-white capitalize">{h.hazard_type.replace("_"," ")}</div>
                            <div className="text-xs text-slate-400">{u?.name||"Anonymous"} · {fmt(h.created_at)}</div>
                            {h.description && <div className="text-xs text-slate-500 mt-0.5">{h.description}</div>}
                          </div>
                        </div>
                        <span className={`text-xs font-bold font-mono capitalize ${sev[h.severity]||"text-slate-400"}`}>
                          {h.severity}
                        </span>
                        <a href={`https://www.google.com/maps?q=${h.lat},${h.lng}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                          🗺 View
                        </a>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        )}

      </div>
    </div>
  );
}