import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── MORTH 2024 data embedded directly — no API needed ─────
const STATIC = {
  total_2024:      485000,
  fatalities_2024: 172000,
  injuries_2024:   460000,
  daily_average:   1329,
  hotspots: [
    { state:"Tamil Nadu",     accidents:64315 },
    { state:"Madhya Pradesh", accidents:54432 },
    { state:"Uttar Pradesh",  accidents:42568 },
    { state:"Karnataka",      accidents:34156 },
    { state:"Maharashtra",    accidents:33789 },
    { state:"Rajasthan",      accidents:28903 },
  ],
  peak_hours: [
    {hour:"00–03",pct:6},{hour:"03–06",pct:4},{hour:"06–09",pct:12},
    {hour:"09–12",pct:14},{hour:"12–15",pct:13},{hour:"15–18",pct:18},
    {hour:"18–21",pct:21},{hour:"21–24",pct:12},
  ],
  causes: [
    {cause:"Over Speeding",       pct:43.5},
    {cause:"Drunk Driving",       pct:18.3},
    {cause:"Wrong Side",          pct:12.1},
    {cause:"Red Light Jump",      pct:8.7},
    {cause:"Poor Road Condition", pct:6.2},
    {cause:"Others",              pct:11.2},
  ],
  vehicle_wise: [
    {type:"Two-Wheelers",pct:36.6},
    {type:"Cars/Jeeps",  pct:21.8},
    {type:"Trucks",      pct:16.3},
    {type:"Auto/Taxi",   pct:9.4},
    {type:"Buses",       pct:6.8},
    {type:"Others",      pct:9.1},
  ],
};

const PIE_COLORS = ["#ef4444","#f97316","#f59e0b","#22c55e","#3b82f6","#8b5cf6"];
const TT = {
  contentStyle:{ background:"#1e293b",border:"1px solid #334155",
                 borderRadius:"8px",color:"#f1f5f9",fontSize:"11px" },
  labelStyle:  { color:"#94a3b8",fontSize:"10px" },
};

function Num({ n }) {
  const f = n >= 1000 ? `${(n/1000).toFixed(0)}K` : n;
  return <>{f}</>;
}

function Card({ label, value, sub, color }) {
  return (
    <div className="glass rounded-2xl border border-slate-700/50 p-5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">{label}</div>
      <div className="text-3xl font-bold font-display" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

export default function StatsPanel({ stats }) {
  // Use API data if backend is up, otherwise use embedded static data
  // NEVER shows "Loading" — always renders immediately
  const d = stats ?? STATIC;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display text-white">
          📊 India Road Accident Analytics
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Source: Ministry of Road Transport &amp; Highways 2024
        </p>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card label="Total Accidents" value={<Num n={d.total_2024}/>}
          sub="2024" color="#f59e0b" />
        <Card label="Fatalities" value={<Num n={d.fatalities_2024}/>}
          sub="2024" color="#ef4444" />
        <Card label="Injuries" value={<Num n={d.injuries_2024}/>}
          sub="2024" color="#f97316" />
        <Card label="Daily Accidents" value={d.daily_average}
          sub="avg / day" color="#fca5a5" />
      </div>

      {/* Accident Causes Pie */}
      <div className="glass rounded-2xl border border-slate-700/50 p-5">
        <h3 className="font-semibold font-display text-white mb-4">🔍 Accident Causes</h3>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <PieChart width={220} height={220}>
            <Pie data={d.causes} cx={110} cy={110}
              innerRadius={55} outerRadius={95}
              dataKey="pct" nameKey="cause">
              {d.causes.map((_,i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={v=>[`${v}%`,""]} contentStyle={TT.contentStyle} />
          </PieChart>
          <div className="flex-1 space-y-2">
            {d.causes.map((c,i) => (
              <div key={c.cause} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background:PIE_COLORS[i%PIE_COLORS.length] }} />
                <div className="flex-1 flex justify-between items-center text-sm gap-2">
                  <span className="text-slate-300 text-xs">{c.cause}</span>
                  <span className="font-mono text-white font-bold text-xs">{c.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Peak Hours */}
      <div className="glass rounded-2xl border border-slate-700/50 p-5">
        <h3 className="font-semibold font-display text-white mb-4">🕐 Peak Accident Hours</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={d.peak_hours} margin={{top:0,right:10,left:-10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="hour" tick={{fill:"#94a3b8",fontSize:10}} />
            <YAxis tick={{fill:"#94a3b8",fontSize:10}} unit="%" />
            <Tooltip {...TT} formatter={v=>[`${v}%`,"Accidents"]} />
            <Bar dataKey="pct" radius={[4,4,0,0]}>
              {d.peak_hours.map((_,i) => (
                <Cell key={i}
                  fill={i>=6&&i<=8 ? "#ef4444" : i>=5&&i<=7 ? "#f97316" : "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-500 mt-2">
          18:00–21:00 is the most dangerous window · Red = peak danger hours
        </p>
      </div>

      {/* State-wise */}
      <div className="glass rounded-2xl border border-slate-700/50 p-5">
        <h3 className="font-semibold font-display text-white mb-4">🗺️ Accidents by State (Top 6)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={d.hotspots} layout="vertical"
            margin={{top:0,right:30,left:90,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" tick={{fill:"#94a3b8",fontSize:10}} />
            <YAxis type="category" dataKey="state"
              tick={{fill:"#94a3b8",fontSize:10}} width={90} />
            <Tooltip {...TT} formatter={v=>[v.toLocaleString(),"Accidents"]} />
            <Bar dataKey="accidents" radius={[0,4,4,0]}>
              {d.hotspots.map((_,i) => (
                <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Vehicle-wise */}
      <div className="glass rounded-2xl border border-slate-700/50 p-5">
        <h3 className="font-semibold font-display text-white mb-4">🚗 Accidents by Vehicle Type</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={d.vehicle_wise} margin={{top:0,right:10,left:-10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="type" tick={{fill:"#94a3b8",fontSize:10}} />
            <YAxis tick={{fill:"#94a3b8",fontSize:10}} unit="%" />
            <Tooltip {...TT} formatter={v=>[`${v}%`,"Share"]} />
            <Bar dataKey="pct" radius={[4,4,0,0]}>
              {d.vehicle_wise.map((_,i) => (
                <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-500 mt-2">
          Two-wheelers = 36.6% — most vulnerable road users in India
        </p>
      </div>
    </div>
  );
}