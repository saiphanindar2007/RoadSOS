/**
 * GoldenHourTimer — now a small bottom-LEFT floating pill.
 * Only visible when the Emergency Modal is CLOSED.
 * Receives goldenElapsed from App.jsx.
 * Clicks → expands to show a compact info panel.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const GOLDEN_SECONDS = 3600;

const URGENCY_LEVELS = [
  { threshold: 0.67, label: "STABLE",   color: "#22c55e" },
  { threshold: 0.33, label: "SERIOUS",  color: "#f59e0b" },
  { threshold: 0.10, label: "CRITICAL", color: "#ef4444" },
  { threshold: 0,    label: "EXTREME",  color: "#fca5a5" },
];

function getUrgency(elapsed) {
  const remaining = Math.max(0, GOLDEN_SECONDS - elapsed);
  const pct = remaining / GOLDEN_SECONDS;
  return URGENCY_LEVELS.find((u) => pct >= u.threshold) || URGENCY_LEVELS[URGENCY_LEVELS.length - 1];
}

function formatTime(elapsed) {
  const remaining = Math.max(0, GOLDEN_SECONDS - elapsed);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function GoldenHourTimer({ goldenElapsed = 0, active, onClose, onReopen }) {
  const [expanded, setExpanded] = useState(false);

  if (!active || goldenElapsed === 0) return null;

  const urgency = getUrgency(goldenElapsed);
  const timeStr = formatTime(goldenElapsed);
  const pct     = Math.max(0, ((GOLDEN_SECONDS - goldenElapsed) / GOLDEN_SECONDS) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0,   scale: 1   }}
      exit   ={{ opacity: 0, x: -16, scale: 0.92 }}
      style={{
        position: "fixed",
        bottom: "24px",
        left: "16px",
        zIndex: 45,
      }}
    >
      <AnimatePresence mode="wait">
        {!expanded ? (
          /* ── Pill (collapsed) ── */
          <motion.button
            key="pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1   }}
            exit   ={{ opacity: 0, scale: 0.9 }}
            onClick={() => setExpanded(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#0f172a",
              border: `1px solid ${urgency.color}50`,
              borderRadius: "100px",
              padding: "7px 13px 7px 10px",
              cursor: "pointer",
              boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px ${urgency.color}20`,
            }}
          >
            <motion.span
              style={{ fontSize: "14px" }}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: goldenElapsed > 3000 ? 0.7 : 1.5 }}
            >
              ⏱
            </motion.span>
            <span style={{ fontFamily: "monospace", fontWeight: "bold", color: urgency.color, fontSize: "14px", letterSpacing: "0.04em" }}>
              {timeStr}
            </span>
            <span
              style={{
                fontSize: "9px",
                fontWeight: "bold",
                fontFamily: "monospace",
                letterSpacing: "0.1em",
                color: urgency.color,
                background: `${urgency.color}18`,
                border: `1px solid ${urgency.color}35`,
                padding: "1px 6px",
                borderRadius: "20px",
              }}
            >
              {urgency.label}
            </span>
          </motion.button>

        ) : (

          /* ── Expanded card ── */
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1   }}
            exit   ={{ opacity: 0, y: 6, scale: 0.96 }}
            style={{
              background: "#0f172a",
              border: `1px solid ${urgency.color}40`,
              borderRadius: "16px",
              padding: "14px 16px",
              width: "220px",
              boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${urgency.color}15`,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.1em", color: "#475569", textTransform: "uppercase" }}>
                ⏱ Golden Hour
              </span>
              <button
                onClick={() => setExpanded(false)}
                style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: "2px" }}
              >
                ×
              </button>
            </div>

            {/* Time */}
            <div style={{ textAlign: "center", marginBottom: "10px" }}>
              <div style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "32px", color: urgency.color, letterSpacing: "0.06em", lineHeight: 1 }}>
                {timeStr}
              </div>
              <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>remaining in golden hour</div>
            </div>

            {/* Progress bar */}
            <div style={{ height: "4px", background: "#1e293b", borderRadius: "2px", overflow: "hidden", marginBottom: "10px" }}>
              <motion.div
                style={{ height: "100%", background: urgency.color, borderRadius: "2px" }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>

            {/* Status */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  letterSpacing: "0.1em",
                  color: urgency.color,
                  background: `${urgency.color}15`,
                  border: `1px solid ${urgency.color}30`,
                  padding: "3px 8px",
                  borderRadius: "20px",
                }}
              >
                {urgency.label}
              </span>
              <button
                onClick={() => { setExpanded(false); onClose?.(); }}
                style={{ fontSize: "10px", color: "#334155", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}