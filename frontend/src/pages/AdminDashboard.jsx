import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Users, Zap, Brain, RefreshCw, LogOut, Shield, Bell } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const PIE_COLORS = ["#f59e0b", "#ef4444", "#7f1d1d"];
const TT_STYLE   = {
  contentStyle: { background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" },
  labelStyle:   { color: "#94a3b8", fontSize: "11px" },
};

function StatCard({ icon, label, value, sub, color = "text-red-400" }) {
  return (
    <div className="glass rounded-2xl border border-slate-700/50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-2">{label}</div>
          <div className={`text-3xl font-bold font-display ${color}`}>{value}</div>
          {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </div>
        <div className="text-2xl opacity-70">{icon}</div>
      </div>
    </div>
  );
}

function SeverityBadge({ s }) {
  const cfg = {
    Slight:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Serious: "bg-red-500/15 text-red-400 border-red-500/30",
    Fatal:   "bg-red-950/40 text-red-300 border-red-900/40",
  };
  return (
    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${cfg[s] || "bg-slate-700 text-slate-300 border-slate-600"}`}>
      {s}
    </span>
  );
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [loading,      setLoading]      = useState(true);
  const [stats,        setStats]        = useState({ users: 0, sosTotal: 0, sosToday: 0, predictions: 0 });
  const [users,        setUsers]        = useState([]);
  const [sosEvents,    setSosEvents]    = useState([]);
  const [predictions,  setPredictions]  = useState([]);
  const [sevDist,      setSevDist]      = useState([]);
  const [sosTimeline,  setSosTimeline]  = useState([]);
  const [activeTab,    setActiveTab]    = useState("overview");
  const [liveAlert,    setLiveAlert]    = useState(null);

  // ── Fetch all data ────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: usersData },
        { data: sosData   },
        { data: predData  },
      ] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("sos_events").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("ai_predictions").select("*").order("created_at", { ascending: false }).limit(50),
      ]);

      const now   = new Date();
      const today = now.toISOString().split("T")[0];
      const sosToday = (sosData || []).filter((e) => e.created_at.startsWith(today)).length;

      setUsers(usersData || []);
      setSosEvents(sosData || []);
      setPredictions(predData || []);
      setStats({
        users:       (usersData || []).length,
        sosTotal:    (sosData   || []).length,
        sosToday,
        predictions: (predData  || []).length,
      });

      // Severity distribution for pie chart
      const sevCount = { Slight: 0, Serious: 0, Fatal: 0 };
      (predData || []).forEach((p) => {
        if (p.predicted_severity in sevCount) sevCount[p.predicted_severity]++;
      });
      setSevDist([
        { name: "Slight",  value: sevCount.Slight  },
        { name: "Serious", value: sevCount.Serious },
        { name: "Fatal",   value: sevCount.Fatal   },
      ]);

      // SOS timeline: last 7 days
      const days = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
        days[key] = 0;
      }
      (sosData || []).forEach((e) => {
        const d    = new Date(e.created_at);
        const key  = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
        if (key in days) days[key]++;
      });
      setSosTimeline(Object.entries(days).map(([day, count]) => ({ day, count })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Real-time SOS notifications ───────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("admin_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_events" },
        (payload) => {
          setSosEvents((prev) => [payload.new, ...prev.slice(0, 49)]);
          setStats((s) => ({ ...s, sosTotal: s.sosTotal + 1, sosToday: s.sosToday + 1 }));
          setLiveAlert(`🆘 New SOS at ${new Date(payload.new.created_at).toLocaleTimeString("en-IN")}`);
          setTimeout(() => setLiveAlert(null), 5000);
        })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Toggle user role ──────────────────────────────────
  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    if (!error) setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  };

  const fmt = (iso) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const TABS = ["overview", "users", "sos events", "predictions"];

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-lg">🚨</div>
            <div>
              <h1 className="font-bold font-display text-white text-sm">RoadSoS Admin</h1>
              <p className="text-[10px] text-slate-500">Signed in as {profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchAll}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 rounded-lg transition-colors">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 bg-slate-800 rounded-lg transition-colors">
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Live alert */}
      {liveAlert && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-red-600 text-white text-sm font-medium text-center py-2 px-4 flex items-center justify-center gap-2"
        >
          <Bell size={14} /> {liveAlert}
        </motion.div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Tab bar */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all border ${
                activeTab === t
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon="👥" label="Total Users"        value={stats.users}       sub="registered"      color="text-blue-400"   />
              <StatCard icon="🆘" label="SOS Events (Total)" value={stats.sosTotal}    sub="all time"        color="text-red-400"    />
              <StatCard icon="📅" label="SOS Events (Today)" value={stats.sosToday}    sub="last 24 hrs"     color="text-orange-400" />
              <StatCard icon="🤖" label="AI Predictions"     value={stats.predictions} sub="total queries"   color="text-purple-400" />
            </div>

            {/* Charts row */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* SOS Timeline */}
              <div className="glass rounded-2xl border border-slate-700/50 p-5">
                <h3 className="font-semibold font-display text-white mb-4 text-sm">📈 SOS Events — Last 7 Days</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={sosTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                    <Tooltip {...TT_STYLE} />
                    <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: "#ef4444" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Severity Pie */}
              <div className="glass rounded-2xl border border-slate-700/50 p-5">
                <h3 className="font-semibold font-display text-white mb-4 text-sm">🤖 AI Prediction Severity Distribution</h3>
                {sevDist.some((d) => d.value > 0) ? (
                  <div className="flex items-center gap-4">
                    <PieChart width={140} height={140}>
                      <Pie data={sevDist} cx={65} cy={65} innerRadius={38} outerRadius={62} dataKey="value">
                        {sevDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [v, "Predictions"]} contentStyle={TT_STYLE.contentStyle} />
                    </PieChart>
                    <div className="space-y-2">
                      {sevDist.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-sm">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                          <span className="text-slate-300">{d.name}</span>
                          <span className="font-mono font-bold text-white ml-auto">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[140px] text-slate-500 text-sm">
                    No predictions yet
                  </div>
                )}
              </div>
            </div>

            {/* Recent SOS */}
            <div className="glass rounded-2xl border border-slate-700/50 p-5">
              <h3 className="font-semibold font-display text-white mb-4 text-sm">🆘 Recent SOS Events (Live)</h3>
              {sosEvents.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No SOS events yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-slate-700/60">
                        {["Time", "User", "Latitude", "Longitude", "Map"].map((h) => (
                          <th key={h} className="pb-2 pr-4 text-xs font-mono uppercase text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sosEvents.slice(0, 10).map((e) => {
                        const u = users.find((u) => u.id === e.user_id);
                        return (
                          <tr key={e.id} className="border-b border-slate-800/60 hover:bg-white/2">
                            <td className="py-2 pr-4 text-slate-300 text-xs font-mono">{fmt(e.created_at)}</td>
                            <td className="py-2 pr-4 text-slate-300 text-xs">{u?.name || u?.email || "—"}</td>
                            <td className="py-2 pr-4 text-slate-400 text-xs font-mono">{e.lat.toFixed(5)}</td>
                            <td className="py-2 pr-4 text-slate-400 text-xs font-mono">{e.lng.toFixed(5)}</td>
                            <td className="py-2">
                              <a
                                href={`https://www.google.com/maps?q=${e.lat},${e.lng}`}
                                target="_blank" rel="noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 underline"
                              >
                                View
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS ────────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="glass rounded-2xl border border-slate-700/50 p-5">
            <h3 className="font-semibold font-display text-white mb-4">👥 Registered Users ({users.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-700/60">
                    {["Name", "Email", "Role", "Joined", "Action"].map((h) => (
                      <th key={h} className="pb-2 pr-4 text-xs font-mono uppercase text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-800/60 hover:bg-white/2">
                      <td className="py-2.5 pr-4 text-white font-medium text-sm">{u.name || "—"}</td>
                      <td className="py-2.5 pr-4 text-slate-400 text-xs">{u.email}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                          u.role === "admin"
                            ? "bg-red-500/15 text-red-400 border-red-500/30"
                            : "bg-slate-700/60 text-slate-300 border-slate-600"
                        }`}>
                          {u.role === "admin" ? "🛡 ADMIN" : "👤 USER"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400 text-xs font-mono">
                        {new Date(u.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => toggleRole(u.id, u.role)}
                          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Make {u.role === "admin" ? "User" : "Admin"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SOS EVENTS ───────────────────────────────── */}
        {activeTab === "sos events" && (
          <div className="glass rounded-2xl border border-slate-700/50 p-5">
            <h3 className="font-semibold font-display text-white mb-4">🆘 All SOS Events ({sosEvents.length})</h3>
            <div className="space-y-2">
              {sosEvents.map((e) => {
                const u = users.find((u) => u.id === e.user_id);
                return (
                  <div key={e.id}
                    className="flex items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🆘</span>
                      <div>
                        <div className="text-sm font-medium text-white">{u?.name || u?.email || "Anonymous"}</div>
                        <div className="text-xs text-slate-400 font-mono">{fmt(e.created_at)}</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      {e.lat.toFixed(5)}, {e.lng.toFixed(5)}
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${e.lat},${e.lng}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      🗺 Open in Maps
                    </a>
                  </div>
                );
              })}
              {sosEvents.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-8">No SOS events yet</p>
              )}
            </div>
          </div>
        )}

        {/* ── PREDICTIONS ──────────────────────────────── */}
        {activeTab === "predictions" && (
          <div className="glass rounded-2xl border border-slate-700/50 p-5">
            <h3 className="font-semibold font-display text-white mb-4">🤖 AI Prediction Log ({predictions.length})</h3>
            <div className="space-y-2">
              {predictions.map((p) => {
                const u = users.find((u) => u.id === p.user_id);
                return (
                  <div key={p.id}
                    className="flex items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🧠</span>
                      <div>
                        <div className="text-sm font-medium text-white">{u?.name || u?.email || "Anonymous"}</div>
                        <div className="text-xs text-slate-400 font-mono">{fmt(p.created_at)}</div>
                      </div>
                    </div>
                    <SeverityBadge s={p.predicted_severity} />
                    <div className="text-xs font-mono text-slate-400">
                      {p.confidence?.toFixed(1)}% confidence
                    </div>
                  </div>
                );
              })}
              {predictions.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-8">No predictions logged yet</p>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}