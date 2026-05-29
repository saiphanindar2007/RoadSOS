import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Loader2 } from "lucide-react";

const PIE_COLORS = ["#ef4444","#f97316","#f59e0b","#22c55e","#3b82f6","#8b5cf6"];

const TOOLTIP_STYLE = {
  contentStyle: { background:"#1e293b", border:"1px solid #334155", borderRadius:"8px", color:"#f1f5f9" },
  labelStyle:   { color:"#94a3b8", fontSize:"12px" },
};

function StatBox({ label, value, sub, color="text-red-400" }) {
  return (
    <div className="glass rounded-xl p-4 border border-slate-700/50">
      <div className={`text-2xl font-bold font-display ${color}`}>{value}</div>
      <div className="text-sm font-medium text-white mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function StatsPanel({ stats }) {
  if (!stats) {
    return (
      <div className="flex items-center gap-2 text-slate-400 py-10">
        <Loader2 size={18} className="animate-spin text-red-500" /> Loading analytics…
      </div>
    );
  }

  const fmt = (n) => n >= 1000 ? `${(n/1000).toFixed(0)}K` : n;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold font-display text-white">📊 India Road Accident Analytics</h2>
        <p className="text-sm text-slate-400 mt-1">Source: Ministry of Road Transport & Highways 2024</p>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Total Accidents"  value={fmt(stats.total_2024)}     sub="2024" color="text-amber-400" />
        <StatBox label="Fatalities"       value={fmt(stats.fatalities_2024)} sub="2024" color="text-red-400"   />
        <StatBox label="Injuries"         value={fmt(stats.injuries_2024)}   sub="2024" color="text-orange-400"/>
        <StatBox label="Daily Accidents"  value={stats.daily_average}        sub="avg / day" color="text-rose-400" />
      </div>

      {/* Accident Causes — Pie */}
      <div className="glass rounded-2xl p-5 border border-slate-700/50">
        <h3 className="font-semibold font-display text-white mb-4">🔍 Accident Causes</h3>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <PieChart width={220} height={220}>
            <Pie
              data={stats.causes}
              cx={110} cy={110}
              innerRadius={55} outerRadius={95}
              dataKey="pct"
              nameKey="cause"
            >
              {stats.causes.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [`${v}%`, ""]}
              contentStyle={TOOLTIP_STYLE.contentStyle}
            />
          </PieChart>
          <div className="flex-1 space-y-2">
            {stats.causes.map((c, i) => (
              <div key={c.cause} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <div className="flex-1 flex justify-between items-center text-sm gap-2">
                  <span className="text-slate-300">{c.cause}</span>
                  <span className="font-mono text-white">{c.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Peak Hours */}
      <div className="glass rounded-2xl p-5 border border-slate-700/50">
        <h3 className="font-semibold font-display text-white mb-4">🕐 Peak Accident Hours</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.peak_hours} margin={{ top:0, right:10, left:-10, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="hour" tick={{ fill:"#94a3b8", fontSize:11 }} />
            <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} unit="%" />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Accidents"]} />
            <Bar dataKey="pct" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-500 mt-2">18:00–21:00 is the most dangerous window (rush hour + low visibility)</p>
      </div>

      {/* State-wise */}
      <div className="glass rounded-2xl p-5 border border-slate-700/50">
        <h3 className="font-semibold font-display text-white mb-4">🗺️ Accidents by State (Top 6)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.hotspots} layout="vertical" margin={{ top:0, right:30, left:80, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" tick={{ fill:"#94a3b8", fontSize:11 }} />
            <YAxis type="category" dataKey="state" tick={{ fill:"#94a3b8", fontSize:11 }} width={80} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v.toLocaleString(), "Accidents"]} />
            <Bar dataKey="accidents" fill="#f97316" radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Vehicle-wise */}
      <div className="glass rounded-2xl p-5 border border-slate-700/50">
        <h3 className="font-semibold font-display text-white mb-4">🚗 Accidents by Vehicle Type</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.vehicle_wise} margin={{ top:0, right:10, left:-10, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="type" tick={{ fill:"#94a3b8", fontSize:10 }} />
            <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} unit="%" />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Share"]} />
            <Bar dataKey="pct" radius={[4,4,0,0]}>
              {stats.vehicle_wise.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-500 mt-2">Two-wheelers account for 36.6% — the most vulnerable road users</p>
      </div>
    </div>
  );
}