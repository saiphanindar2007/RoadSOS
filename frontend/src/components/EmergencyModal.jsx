import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GOLDEN_SECONDS = 3600;

const URGENCY_LEVELS = [
  { threshold: 0.67, label: "STABLE",   hex: "#22c55e", track: "#166534", bar: "#22c55e" },
  { threshold: 0.33, label: "SERIOUS",  hex: "#f59e0b", track: "#92400e", bar: "#f59e0b" },
  { threshold: 0.10, label: "CRITICAL", hex: "#ef4444", track: "#7f1d1d", bar: "#ef4444" },
  { threshold: 0,    label: "EXTREME",  hex: "#fca5a5", track: "#450a0a", bar: "#fca5a5" },
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

const QUICK_DIALS = [
  { num: "112", label: "Emergency", emoji: "🆘", bg: "#b91c1c", shadow: "rgba(185,28,28,0.4)"  },
  { num: "108", label: "Ambulance", emoji: "🚑", bg: "#be123c", shadow: "rgba(190,18,60,0.4)"  },
  { num: "100", label: "Police",    emoji: "🚔", bg: "#1d4ed8", shadow: "rgba(29,78,216,0.4)"  },
  { num: "101", label: "Fire",      emoji: "🚒", bg: "#c2410c", shadow: "rgba(194,65,12,0.4)"  },
];

const SVC_ICON = { hospital: "🏥", police: "🚔", fire: "🚒", pharmacy: "💊", other: "📍" };

const FIRST_AID = [
  "Do NOT move the injured — risk of spinal injury",
  "Call 108 now, share exact GPS location",
  "Apply firm pressure on visible bleeding wounds",
  "Keep patient warm, still, and conscious",
  "Do NOT give food or water to an unconscious person",
];

const SEV_COLORS = { Slight: "#f59e0b", Serious: "#ef4444", Fatal: "#fca5a5" };

export default function EmergencyModal({ service, services, result, onClose, goldenElapsed = 0 }) {
  const [showFirstAid, setShowFirstAid] = useState(false);

  const urgency  = getUrgency(goldenElapsed);
  const timeStr  = formatTime(goldenElapsed);
  const pct      = Math.max(0, ((GOLDEN_SECONDS - goldenElapsed) / GOLDEN_SECONDS) * 100);
  const isActive = goldenElapsed > 0;

  const displayServices = service
    ? [service]
    : (services || []).slice(0, 4);

  return (
    <>
      {/* ── Backdrop — z-index 9999 covers Leaflet ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,                          // ← KEY FIX
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* ── Modal wrapper — same z-index, flex center ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,                          // ← KEY FIX
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        {/* ── Modal card ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit   ={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: "440px",
            maxHeight: "calc(100vh - 40px)",     // ← KEY FIX — scroll on small screens
            overflowY: "auto",                   // ← KEY FIX
            borderRadius: "24px",
            background: "#0f172a",
            border: "1px solid rgba(239,68,68,0.25)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(239,68,68,0.1)",
          }}
        >

          {/* ── Golden Hour strip (top) ── */}
          {isActive && (
            <div style={{ background: `${urgency.hex}12`, borderBottom: `1px solid ${urgency.hex}28` }}>
              <div style={{ height: "3px", background: urgency.track, position: "relative" }}>
                <motion.div
                  style={{ height: "100%", background: urgency.bar, position: "absolute", left: 0, top: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <motion.span
                    style={{ fontSize: "13px" }}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: goldenElapsed > 3000 ? 0.7 : 1.5 }}
                  >
                    ⏱
                  </motion.span>
                  <span style={{ fontFamily: "monospace", fontSize: "15px", fontWeight: "bold", color: urgency.hex, letterSpacing: "0.05em" }}>
                    {timeStr}
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>remaining</span>
                </div>
                <span style={{
                  fontSize: "10px", fontWeight: "bold", fontFamily: "monospace", letterSpacing: "0.12em",
                  color: urgency.hex, background: `${urgency.hex}18`, border: `1px solid ${urgency.hex}40`,
                  padding: "2px 8px", borderRadius: "20px",
                }}>
                  {urgency.label}
                </span>
              </div>
            </div>
          )}

          {/* ── Header ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px",
            background: "linear-gradient(135deg, #1a0505 0%, #0f172a 100%)",
            borderBottom: "1px solid rgba(239,68,68,0.15)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                style={{
                  width: "40px", height: "40px", borderRadius: "12px",
                  background: "#dc2626",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                🚨
              </motion.div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: "bold", color: "#f1f5f9", fontSize: "15px" }}>
                  Emergency Activated
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                  Stay calm · Help is on the way
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px", color: "#94a3b8", cursor: "pointer",
                width: "32px", height: "32px", fontSize: "17px", lineHeight: "32px",
                textAlign: "center", transition: "background 0.15s",
              }}
            >
              ×
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: "0 16px 20px" }}>

            {/* AI Severity badge */}
            {result && (
              <div style={{
                margin: "14px 0",
                padding: "10px 14px",
                borderRadius: "12px",
                background: `${SEV_COLORS[result.severity_label] || "#f59e0b"}14`,
                border: `1px solid ${SEV_COLORS[result.severity_label] || "#f59e0b"}30`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>{result.severity_emoji || "⚠️"}</span>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace" }}>
                      AI Predicted Severity
                    </div>
                    <div style={{ fontWeight: "bold", color: SEV_COLORS[result.severity_label] || "#f59e0b", fontSize: "14px", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {result.severity_label}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#475569" }}>Confidence</div>
                  <div style={{ fontFamily: "monospace", fontWeight: "bold", color: "#e2e8f0", fontSize: "15px" }}>
                    {result.confidence?.toFixed(0)}%
                  </div>
                </div>
              </div>
            )}

            {/* Quick Dial */}
            <div style={{ marginTop: "14px" }}>
              <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", marginBottom: "10px" }}>
                Quick dial
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {QUICK_DIALS.map(({ num, label, emoji, bg, shadow }) => (
                  <a
                    key={num}
                    href={`tel:${num}`}
                    style={{
                      background: bg, borderRadius: "14px", padding: "14px 12px",
                      textDecoration: "none", display: "flex", flexDirection: "column",
                      alignItems: "center", gap: "4px", cursor: "pointer",
                      boxShadow: `0 4px 16px ${shadow}`,
                      transition: "filter 0.15s, transform 0.12s",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.filter = "brightness(1.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseOut={(e)  => { e.currentTarget.style.filter = "brightness(1)";    e.currentTarget.style.transform = "translateY(0)"; }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
                    onMouseUp  ={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                  >
                    <span style={{ fontSize: "22px", lineHeight: 1 }}>{emoji}</span>
                    <span style={{ fontFamily: "monospace", fontWeight: "bold", color: "white", fontSize: "20px", lineHeight: 1.1, letterSpacing: "0.04em" }}>{num}</span>
                    <span style={{ color: "rgba(255,255,255,0.72)", fontSize: "11px", fontWeight: "500" }}>{label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Nearest Services */}
            {displayServices.length > 0 && (
              <div style={{ marginTop: "18px" }}>
                <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", marginBottom: "8px" }}>
                  Nearest services
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {displayServices.map((svc) => (
                    <div
                      key={svc.id}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "12px", gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        <span style={{ fontSize: "18px", flexShrink: 0 }}>{SVC_ICON[svc.type] || "📍"}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#f1f5f9", fontSize: "13px", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {svc.name}
                          </div>
                          <div style={{ color: "#475569", fontSize: "11px", marginTop: "1px" }}>{svc.distance_text} away</div>
                        </div>
                      </div>
                      {svc.phone && (
                        <a
                          href={`tel:${svc.phone}`}
                          style={{
                            background: "#dc2626", borderRadius: "8px", color: "white",
                            fontSize: "12px", fontWeight: "bold", fontFamily: "monospace",
                            padding: "6px 12px", textDecoration: "none", flexShrink: 0,
                            display: "flex", alignItems: "center", gap: "5px",
                          }}
                        >
                          📞 {svc.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* First Aid Accordion */}
            <div style={{ marginTop: "14px" }}>
              <button
                onClick={() => setShowFirstAid((v) => !v)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.22)",
                  borderRadius: showFirstAid ? "12px 12px 0 0" : "12px",
                  cursor: "pointer", color: "#fbbf24",
                  fontSize: "12px", fontWeight: "bold", letterSpacing: "0.06em",
                  textTransform: "uppercase", fontFamily: "monospace",
                }}
              >
                <span>⚡ First Aid Checklist</span>
                <span style={{ fontSize: "14px", fontFamily: "sans-serif", fontWeight: "normal" }}>
                  {showFirstAid ? "▲" : "▼"}
                </span>
              </button>

              <AnimatePresence>
                {showFirstAid && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{
                      background: "rgba(245,158,11,0.05)",
                      border: "1px solid rgba(245,158,11,0.15)",
                      borderTop: "none", borderRadius: "0 0 12px 12px",
                      padding: "12px 14px",
                    }}>
                      {FIRST_AID.map((tip, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: "10px",
                            padding: "5px 0",
                            borderBottom: i < FIRST_AID.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          }}
                        >
                          <span style={{ color: "#fbbf24", fontSize: "12px", fontFamily: "monospace", flexShrink: 0, marginTop: "1px" }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span style={{ color: "#cbd5e1", fontSize: "12px", lineHeight: "1.5" }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </>
  );
}