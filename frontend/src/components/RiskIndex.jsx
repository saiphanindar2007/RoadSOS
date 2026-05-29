/**
 * RiskIndex — Live Road Risk Index widget
 * Calculates a 0–100 risk score from:
 *   • Time of day (peak hours = higher risk)
 *   • Day of week (weekends = higher drunk driving risk)
 *   • Simulated weather (seeded by hour + date for consistency)
 *   • Pedestrian activity windows
 * Updates every 60 seconds automatically.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Clock } from "lucide-react";

const CIRCUMFERENCE = 2 * Math.PI * 28;

function computeRisk() {
  const now  = new Date();
  const h    = now.getHours();
  const day  = now.getDay(); // 0=Sun, 6=Sat

  // Time risk (0–38 pts) — modelled on India road accident peak hours
  const timeRisk = (() => {
    if (h >= 22 || h < 4) return 38; // Late night — drunk driving, low visibility
    if (h >= 18 && h < 22) return 34; // Evening rush — highest nationally
    if (h >= 7  && h < 10) return 28; // Morning rush
    if (h >= 12 && h < 14) return 19; // Afternoon
    if (h >= 4  && h < 7)  return 22; // Pre-dawn — drowsy driving
    return 14;
  })();

  // Day risk (0–18 pts)
  const dayRisk = (day === 0 || day === 6) ? 17 : 10;

  // Simulated weather (seeded, 0–25 pts) — changes each hour
  const seed        = (h * 41 + now.getDate() * 7) % 100;
  const weatherRisk = seed < 60 ? 8 : seed < 80 ? 16 : seed < 92 ? 22 : 25;

  // Pedestrian window (0–15 pts)
  const pedRisk = (h >= 8 && h <= 10) || (h >= 16 && h <= 20) ? 13 : 5;

  return {
    score:   Math.min(99, timeRisk + dayRisk + weatherRisk + pedRisk),
    factors: {
      "Time of Day":    timeRisk,
      "Day / Weekend":  dayRisk,
      "Weather Risk":   weatherRisk,
      "Pedestrian Vol.":pedRisk,
    },
  };
}

const LEVELS = [
  { max: 30,  label: "LOW",      color: "#22c55e", desc: "Safe to drive — normal caution"          },
  { max: 55,  label: "MODERATE", color: "#f59e0b", desc: "Caution advised — watch intersections"   },
  { max: 75,  label: "HIGH",     color: "#ef4444", desc: "High-risk period — drive defensively"    },
  { max: 99,  label: "CRITICAL", color: "#fca5a5", desc: "Extreme risk — avoid non-essential travel"},
];

function getLevel(score) {
  return LEVELS.find((l) => score <= l.max) || LEVELS[LEVELS.length - 1];
}

export default function RiskIndex() {
  const [data, setData]   = useState(() => computeRisk());
  const [time, setTime]   = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => {
      setData(computeRisk());
      setTime(new Date());
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const level    = getLevel(data.score);
  const dashOff  = CIRCUMFERENCE * (1 - data.score / 100);

  const timeStr = time.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  return (
    <div
      className="glass rounded-2xl border p-4 mb-4"
      style={{ borderColor: `${level.color}30` }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left — label + desc + factors */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">
              Live Road Risk Index
            </span>
          </div>
          <div
            className="text-lg font-bold font-display mb-0.5"
            style={{ color: level.color }}
          >
            {level.label} RISK
          </div>
          <p className="text-[11px] text-slate-400 mb-2">{level.desc}</p>

          {/* Factor mini-bars */}
          <div className="space-y-1">
            {Object.entries(data.factors).map(([name, val]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 w-20 flex-shrink-0">{name}</span>
                <div className="flex-1 h-1 bg-slate-700/60 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: level.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(val / 38) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-400 w-4">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — SVG gauge */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            {/* Track */}
            <circle cx="36" cy="36" r="28" fill="none" stroke="#1e293b" strokeWidth="5.5" />
            {/* Arc */}
            <motion.circle
              cx="36" cy="36" r="28"
              fill="none"
              stroke={level.color}
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: dashOff }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              transform="rotate(-90 36 36)"
            />
            {/* Score number */}
            <text
              x="36" y="38"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fontFamily="monospace"
              fill={level.color}
            >
              {data.score}
            </text>
            <text
              x="36" y="50"
              textAnchor="middle"
              fontSize="7"
              fontFamily="monospace"
              fill="#64748b"
            >
              /100
            </text>
          </svg>
          <div className="flex items-center gap-1 text-[9px] text-slate-500">
            <Clock size={8} />
            {timeStr}
          </div>
        </div>
      </div>
    </div>
  );
}