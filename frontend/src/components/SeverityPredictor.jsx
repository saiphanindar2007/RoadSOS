import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Brain, Loader2, AlertTriangle, ChevronRight } from "lucide-react";
import ServiceCard from "./ServiceCard";

const API = import.meta.env.VITE_API_BASE_URL || "";

const FIELDS = [
  {
    key: "road_type", label: "Road Type", icon: "🛣️",
    options: [
      { v:0, l:"Single Carriageway" }, { v:1, l:"Dual Carriageway" },
      { v:2, l:"Roundabout" },         { v:3, l:"Slip Road" },
    ]
  },
  {
    key: "speed_limit", label: "Speed Limit (km/h)", icon: "⚡",
    options: [20,30,40,50,60,70,80,100].map(v=>({v, l:`${v} km/h`}))
  },
  {
    key: "weather", label: "Weather Conditions", icon: "🌦️",
    options: [
      {v:0,l:"Fine / Clear"}, {v:1,l:"Raining"}, {v:2,l:"Fog / Mist"},
      {v:3,l:"High Winds"},   {v:4,l:"Snow / Hail"},
    ]
  },
  {
    key: "road_surface", label: "Road Surface", icon: "🏗️",
    options: [
      {v:0,l:"Dry"}, {v:1,l:"Wet / Damp"}, {v:2,l:"Ice / Snow"}, {v:3,l:"Flooded"},
    ]
  },
  {
    key: "light_conditions", label: "Light Conditions", icon: "💡",
    options: [
      {v:0,l:"Daylight"}, {v:1,l:"Dark — Street Lit"}, {v:2,l:"Dark — No Lighting"},
    ]
  },
  {
    key: "vehicle_type", label: "Vehicle Type", icon: "🚗",
    options: [
      {v:0,l:"Car / Jeep"}, {v:1,l:"Motorcycle / Scooter"}, {v:2,l:"Bus / Van"},
      {v:3,l:"Truck / HGV"},  {v:4,l:"Bicycle"},
    ]
  },
  {
    key: "num_vehicles", label: "Vehicles Involved", icon: "🔢",
    options: [1,2,3,4,5,6].map(v=>({v, l:`${v} vehicle${v>1?"s":""}`}))
  },
  {
    key: "time_of_day", label: "Time of Day", icon: "🕐",
    options: [
      {v:0,l:"Morning (6–12)"}, {v:1,l:"Afternoon (12–18)"},
      {v:2,l:"Evening (18–21)"},{v:3,l:"Night (21–6)"},
    ]
  },
  {
    key: "junction_detail", label: "Junction Type", icon: "↔️",
    options: [
      {v:0,l:"No Junction"}, {v:1,l:"Roundabout"},
      {v:2,l:"T-Junction"},  {v:3,l:"Crossroads"},
    ]
  },
  {
    key: "pedestrians_involved", label: "Pedestrians Involved?", icon: "🚶",
    options: [{v:0,l:"No"}, {v:1,l:"Yes"}]
  },
];

const DEFAULTS = {
  road_type:0, speed_limit:50, weather:0, road_surface:0,
  light_conditions:0, vehicle_type:0, num_vehicles:1,
  time_of_day:0, junction_detail:0, pedestrians_involved:0,
};

const SEV_CONFIG = {
  Slight:  { bg:"bg-amber-500/15",  border:"border-amber-500/40",  text:"text-amber-400",  badge:"bg-amber-500",  icon:"⚠️"  },
  Serious: { bg:"bg-red-500/15",    border:"border-red-500/40",    text:"text-red-400",    badge:"bg-red-600",    icon:"🚨"  },
  Fatal:   { bg:"bg-red-950/50",    border:"border-red-900/60",    text:"text-red-300",    badge:"bg-red-900",    icon:"🆘"  },
};

export default function SeverityPredictor({ onResult, result, topServices, onCallService }) {
  const [form, setForm]     = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const handleChange = (key, val) => {
    setForm((f) => ({ ...f, [key]: Number(val) }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/api/predict-severity`, form);
      onResult(data);
    } catch (e) {
      setError(e.response?.data?.detail || "Backend not reachable. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? SEV_CONFIG[result.severity_label] : null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-xl flex-shrink-0">
          🤖
        </div>
        <div>
          <h2 className="text-xl font-bold font-display text-white">AI Severity Predictor</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Enter accident conditions — Random Forest model predicts injury severity and recommends services.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="glass rounded-2xl p-5 border border-slate-700/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map(({ key, label, icon, options }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {icon} {label}
              </label>
              <select
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/60 transition-colors cursor-pointer"
              >
                {options.map(({ v, l }) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3">
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold font-display py-3 rounded-xl transition-colors text-sm"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Predicting…</>
            : <><Brain size={16} /> Predict Severity <ChevronRight size={16} /></>
          }
        </button>
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && cfg && (
          <motion.div
            initial={{ opacity:0, y:16, scale:0.97 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-10 }}
            transition={{ duration:0.35 }}
            className={`rounded-2xl border p-5 ${cfg.bg} ${cfg.border}`}
          >
            {/* Severity badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{result.severity_emoji}</span>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">Predicted Severity</div>
                  <div className={`text-2xl font-bold font-display ${cfg.text}`}>
                    {result.severity_label}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 mb-0.5">Confidence</div>
                <div className="text-xl font-mono font-bold text-white">{result.confidence.toFixed(0)}%</div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">{result.description}</p>

            {/* Probability bars */}
            <div className="space-y-2 mb-4">
              {[
                { label:"Slight",  val:result.probabilities.slight,  cls:"bar-slight"  },
                { label:"Serious", val:result.probabilities.serious, cls:"bar-serious" },
                { label:"Fatal",   val:result.probabilities.fatal,   cls:"bar-fatal"   },
              ].map(({ label, val, cls }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{label}</span><span>{val.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${cls}`}
                      initial={{ width:0 }}
                      animate={{ width:`${val}%` }}
                      transition={{ duration:0.7, ease:"easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Recommended services */}
            {result.recommended_services?.length > 0 && (
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">
                  Recommended — Call These Now
                </div>
                <div className="flex flex-wrap gap-2">
                  {topServices
                    .filter(s => result.recommended_services.includes(s.type))
                    .slice(0,3)
                    .map(svc => (
                      <button
                        key={svc.id}
                        onClick={() => onCallService(svc)}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                      >
                        📞 {svc.name} · {svc.distance_text}
                      </button>
                    ))
                  }
                  {result.recommended_services.includes("ambulance") && (
                    <a href="tel:108" className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                      🚑 Ambulance 108
                    </a>
                  )}
                  {result.recommended_services.includes("police") && (
                    <a href="tel:100" className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                      🚔 Police 100
                    </a>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}