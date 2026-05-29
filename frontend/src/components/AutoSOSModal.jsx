/**
 * AutoSOSModal
 * Triggered by the enhanced shake detector.
 * Shows a dramatic countdown → animates alerting each service →
 * then opens WhatsApp / SMS / Web Share with a pre-built emergency message.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Emergency services to contact ─────────────────────────
const SVC_TARGETS = [
  { key:"hospital", emoji:"🏥", label:"Nearest Hospital",  num:"108", color:"#ef4444" },
  { key:"police",   emoji:"🚔", label:"Police Station",    num:"100", color:"#3b82f6" },
  { key:"fire",     emoji:"🚒", label:"Fire & Rescue",     num:"101", color:"#f97316" },
  { key:"pharmacy", emoji:"💊", label:"Nearest Pharmacy",  num:"104", color:"#22c55e" },
];

function nearestByType(services) {
  const out = {};
  for (const t of SVC_TARGETS) {
    const found = services.find(s => s.type === t.key);
    if (found) out[t.key] = found;
  }
  return out;
}

function buildEmergencyMessage(location, nearestMap) {
  const locLine = location
    ? `https://maps.google.com/?q=${location.lat.toFixed(6)},${location.lng.toFixed(6)}`
    : "Location unavailable";
  const time = new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });
  const date = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });

  let msg = `🆘 AUTO-SOS EMERGENCY ALERT\n`;
  msg    += `Crash / Impact detected automatically.\n\n`;
  msg    += `📍 My Location:\n${locLine}\n\n`;
  if (nearestMap.hospital)
    msg  += `🏥 Nearest Hospital: ${nearestMap.hospital.name} (${nearestMap.hospital.distance_text})\n`;
  if (nearestMap.police)
    msg  += `🚔 Nearest Police: ${nearestMap.police.name} (${nearestMap.police.distance_text})\n`;
  if (nearestMap.fire)
    msg  += `🚒 Nearest Fire: ${nearestMap.fire.name} (${nearestMap.fire.distance_text})\n`;
  msg    += `\n🕐 ${time}, ${date}\n`;
  msg    += `Sent via RoadSoS AI Emergency Response`;
  return msg;
}

const waLink  = (num, msg) => `https://wa.me/91${num}?text=${encodeURIComponent(msg)}`;
const smsLink = (num, msg) => `sms:${num}?body=${encodeURIComponent(msg)}`;

// ─────────────────────────────────────────────────────────
export default function AutoSOSModal({ services = [], location, onCancel }) {
  const [countdown,   setCountdown]   = useState(5);
  const [alertPhase,  setAlertPhase]  = useState("countdown"); // countdown|alerting|sent
  const [alertedIdx,  setAlertedIdx]  = useState(-1);
  const [copied,      setCopied]      = useState(false);
  const timerRef = useRef(null);

  const nearest      = nearestByType(services);
  const message      = buildEmergencyMessage(location, nearest);
  const mapsUrl      = location
    ? `https://maps.google.com/?q=${location.lat.toFixed(6)},${location.lng.toFixed(6)}`
    : null;

  // ── Countdown ─────────────────────────────────────────
  useEffect(() => {
    if (alertPhase !== "countdown") return;
    if (countdown <= 0) { startAlerting(); return; }
    timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [countdown, alertPhase]); // eslint-disable-line

  // ── Animate through services then send ────────────────
  const startAlerting = useCallback(() => {
    clearTimeout(timerRef.current);
    setAlertPhase("alerting");
    SVC_TARGETS.forEach((_, i) => {
      setTimeout(() => {
        setAlertedIdx(i);
        if (i === SVC_TARGETS.length - 1) {
          setTimeout(() => {
            setAlertPhase("sent");
            doSend();
          }, 700);
        }
      }, i * 550);
    });
  }, []); // eslint-disable-line

  // ── Actual message dispatch ───────────────────────────
  const doSend = useCallback(async () => {
    // Best experience: Web Share API (native sheet on Android/iOS)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "🆘 EMERGENCY — Immediate help needed",
          text:  message,
        });
        return;
      } catch (_) { /* user dismissed */ }
    }
    // Fallback: copy to clipboard
    navigator.clipboard?.writeText(message).catch(() => {});
  }, [message]);

  const handleSendNow = () => {
    clearTimeout(timerRef.current);
    setCountdown(0);
    startAlerting();
  };

  const handleCancel = () => {
    clearTimeout(timerRef.current);
    onCancel?.();
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Shared button style factory ───────────────────────
  const btn = (bg, border, color = "white") => ({
    display:"block", textAlign:"center", textDecoration:"none",
    background:bg, border:`1px solid ${border}`,
    color, fontWeight:"700", fontSize:"12px",
    padding:"10px 8px", borderRadius:"10px",
    cursor:"pointer", fontFamily:"system-ui, sans-serif",
    transition:"filter 0.15s",
  });

  return (
    <>
      {/* ── Pulsing red backdrop ────────────────────────── */}
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        style={{ position:"fixed", inset:0, zIndex:9990 }}
      >
        {/* Expanding sonar rings */}
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            animate={{ scale:[1, 2.5+i*0.4, 1], opacity:[0.25, 0, 0.25] }}
            transition={{ repeat:Infinity, duration:1.6, delay:i * 0.35 }}
            style={{
              position:"absolute", top:"50%", left:"50%",
              transform:"translate(-50%,-50%)",
              width:"200px", height:"200px",
              borderRadius:"50%",
              background:`rgba(220,38,38,${0.25 - i*0.06})`,
              pointerEvents:"none",
            }}
          />
        ))}
        {/* Dark overlay */}
        <div style={{
          position:"absolute", inset:0,
          background:"rgba(0,0,0,0.88)",
          backdropFilter:"blur(10px)",
          WebkitBackdropFilter:"blur(10px)",
        }} />
      </motion.div>

      {/* ── Main card ──────────────────────────────────── */}
      <motion.div
        initial={{ scale:0.85, opacity:0, y:20 }}
        animate={{ scale:1, opacity:1, y:0 }}
        exit={{ scale:0.92, opacity:0 }}
        transition={{ type:"spring", stiffness:320, damping:26 }}
        style={{
          position:"fixed", inset:0, zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:"16px",
        }}
      >
        <div style={{
          width:"100%", maxWidth:"420px",
          maxHeight:"92vh", overflowY:"auto",
          background:"#0a0f1a",
          border:"2px solid rgba(239,68,68,0.55)",
          borderRadius:"24px",
          boxShadow:"0 0 80px rgba(239,68,68,0.35), 0 32px 80px rgba(0,0,0,0.9)",
        }}>

          {/* ── Header ── */}
          <div style={{
            padding:"22px 20px 16px",
            background:"linear-gradient(180deg,rgba(127,29,29,0.55) 0%,transparent 100%)",
            borderBottom:"1px solid rgba(239,68,68,0.18)",
            textAlign:"center",
          }}>
            <motion.div
              animate={{ scale:[1, 1.18, 1] }}
              transition={{ repeat:Infinity, duration:0.75 }}
              style={{ fontSize:"52px", lineHeight:1, marginBottom:"10px" }}
            >
              🚨
            </motion.div>
            <div style={{ fontFamily:"monospace", fontWeight:"900", fontSize:"21px", color:"#fca5a5", letterSpacing:"0.07em" }}>
              AUTO-SOS ACTIVATED
            </div>
            <div style={{ fontSize:"12px", color:"#94a3b8", marginTop:"5px" }}>
              {alertPhase === "countdown" && "Strong impact / crash detected"}
              {alertPhase === "alerting"  && "🔴 Alerting emergency services…"}
              {alertPhase === "sent"      && "✅ Emergency messages prepared"}
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ padding:"0 18px 20px" }}>

            {/* COUNTDOWN */}
            {alertPhase === "countdown" && (
              <div style={{ textAlign:"center", padding:"18px 0 10px" }}>
                <div style={{ fontSize:"11px", fontFamily:"monospace", color:"#475569", letterSpacing:"0.12em", marginBottom:"6px" }}>
                  SENDING EMERGENCY ALERTS IN
                </div>
                <motion.div
                  key={countdown}
                  initial={{ scale:1.4, opacity:0 }}
                  animate={{ scale:1,   opacity:1 }}
                  style={{ fontSize:"72px", fontWeight:"900", fontFamily:"monospace", color:"#ef4444", lineHeight:1 }}
                >
                  {countdown}
                </motion.div>
                {/* Draining bar */}
                <div style={{ height:"5px", background:"#1e293b", borderRadius:"3px", margin:"14px 0 6px", overflow:"hidden" }}>
                  <motion.div
                    animate={{ width:`${(countdown/5)*100}%` }}
                    transition={{ duration:1, ease:"linear" }}
                    style={{ height:"100%", background:"linear-gradient(90deg,#7f1d1d,#ef4444)", borderRadius:"3px" }}
                  />
                </div>
              </div>
            )}

            {/* SERVICE ALERT CARDS */}
            <div style={{ marginTop:"14px" }}>
              <div style={{ fontSize:"10px", fontFamily:"monospace", color:"#475569", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px" }}>
                Emergency services being alerted
              </div>

              {SVC_TARGETS.map((cfg, i) => {
                const svc     = nearest[cfg.key];
                const done    = alertedIdx > i || alertPhase === "sent";
                const active  = alertedIdx === i && alertPhase === "alerting";
                const pending = !done && !active;

                return (
                  <motion.div
                    key={cfg.key}
                    animate={{
                      opacity: done ? 1 : active ? 1 : 0.3,
                      scale:   active ? [1, 1.02, 1] : 1,
                    }}
                    transition={{ scale:{ repeat:active?Infinity:0, duration:0.5 } }}
                    style={{
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"space-between",
                      padding:"11px 13px",
                      marginBottom:"7px",
                      borderRadius:"11px",
                      background: done   ? `${cfg.color}14`
                                : active ? `${cfg.color}22`
                                :          "rgba(255,255,255,0.03)",
                      border:`1px solid ${done||active ? cfg.color+"45" : "rgba(255,255,255,0.06)"}`,
                      transition:"background 0.3s, border-color 0.3s",
                    }}
                  >
                    {/* Left */}
                    <div style={{ display:"flex", alignItems:"center", gap:"11px" }}>
                      <span style={{ fontSize:"22px" }}>{cfg.emoji}</span>
                      <div>
                        <div style={{ fontWeight:"600", color:"#f1f5f9", fontSize:"13px", lineHeight:1.3 }}>
                          {svc ? svc.name : cfg.label}
                        </div>
                        <div style={{ fontSize:"10px", color:"#64748b", marginTop:"2px" }}>
                          {svc ? `${svc.distance_text} away · ` : ""}{cfg.num}
                          {svc?.phone && svc.phone !== cfg.num && ` · ${svc.phone}`}
                        </div>
                      </div>
                    </div>

                    {/* Right — status */}
                    <div style={{ minWidth:"60px", textAlign:"right" }}>
                      {done && (
                        <motion.div
                          initial={{ scale:0, opacity:0 }}
                          animate={{ scale:1, opacity:1 }}
                          style={{ fontSize:"12px", fontWeight:"700", fontFamily:"monospace", color:"#22c55e" }}
                        >
                          ✓ ALERTED
                        </motion.div>
                      )}
                      {active && (
                        <motion.div
                          animate={{ opacity:[1, 0.35, 1] }}
                          transition={{ repeat:Infinity, duration:0.55 }}
                          style={{ fontSize:"10px", fontFamily:"monospace", color:cfg.color, fontWeight:"700" }}
                        >
                          SENDING…
                        </motion.div>
                      )}
                      {pending && (
                        <div style={{ fontSize:"10px", color:"#334155", fontFamily:"monospace" }}>STANDBY</div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* LOCATION ROW */}
            {location && (
              <div style={{
                marginTop:"12px", padding:"10px 13px",
                background:"rgba(59,130,246,0.08)",
                border:"1px solid rgba(59,130,246,0.2)",
                borderRadius:"10px",
              }}>
                <div style={{ fontSize:"10px", color:"#64748b", fontFamily:"monospace", marginBottom:"3px" }}>
                  YOUR GPS LOCATION
                </div>
                <a
                  href={mapsUrl}
                  target="_blank" rel="noreferrer"
                  style={{ fontSize:"11px", color:"#60a5fa", textDecoration:"underline", wordBreak:"break-all" }}
                >
                  📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)} — View on Google Maps
                </a>
              </div>
            )}

            {/* SEND BUTTONS — shown after alerting animation */}
            <AnimatePresence>
              {alertPhase === "sent" && (
                <motion.div
                  initial={{ opacity:0, y:10 }}
                  animate={{ opacity:1, y:0 }}
                  style={{ marginTop:"14px" }}
                >
                  <div style={{ fontSize:"10px", fontFamily:"monospace", color:"#475569", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"9px" }}>
                    Send via — tap to open
                  </div>

                  {/* WhatsApp row */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px", marginBottom:"7px" }}>
                    {[
                      { label:"📱 WhatsApp 108", href:waLink("108", message), bg:"#14532d22", bd:"#16a34a44" },
                      { label:"📱 WhatsApp 100", href:waLink("100", message), bg:"#1e3a8a22", bd:"#2563eb44" },
                    ].map(b => (
                      <a key={b.label} href={b.href} target="_blank" rel="noreferrer"
                        style={btn(b.bg, b.bd)}>
                        {b.label}
                      </a>
                    ))}
                  </div>

                  {/* SMS row */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px", marginBottom:"7px" }}>
                    {[
                      { label:"💬 SMS to 108",  href:smsLink("108", message), bg:"#4c1d9522", bd:"#7c3aed44" },
                      { label:"💬 SMS to 100",  href:smsLink("100", message), bg:"#0c4a6e22", bd:"#0891b244" },
                    ].map(b => (
                      <a key={b.label} href={b.href} target="_blank" rel="noreferrer"
                        style={btn(b.bg, b.bd)}>
                        {b.label}
                      </a>
                    ))}
                  </div>

                  {/* Share + Copy */}
                  {typeof navigator !== "undefined" && navigator.share && (
                    <button
                      onClick={doSend}
                      style={{
                        ...btn("#dc262622","#dc262644"),
                        width:"100%", marginBottom:"7px",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
                      }}
                    >
                      📤 Share Emergency Message (WhatsApp / SMS / etc.)
                    </button>
                  )}

                  <button
                    onClick={handleCopy}
                    style={{
                      ...btn("rgba(255,255,255,0.06)","rgba(255,255,255,0.12)","#94a3b8"),
                      width:"100%",
                    }}
                  >
                    {copied ? "✅ Copied!" : "📋 Copy Emergency Message"}
                  </button>

                  {/* Message preview */}
                  <div style={{
                    marginTop:"12px", padding:"10px",
                    background:"rgba(255,255,255,0.03)",
                    border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:"9px",
                    fontSize:"10px", color:"#64748b",
                    fontFamily:"monospace", whiteSpace:"pre-wrap",
                    wordBreak:"break-word",
                    maxHeight:"100px", overflowY:"auto",
                  }}>
                    {message}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Bottom action buttons ── */}
            <div style={{
              display:"grid",
              gridTemplateColumns: alertPhase === "sent" ? "1fr" : "1fr 1fr",
              gap:"10px",
              marginTop:"16px",
            }}>
              {alertPhase !== "sent" && (
                <>
                  <button
                    onClick={handleCancel}
                    style={{
                      background:"rgba(255,255,255,0.06)",
                      border:"1px solid rgba(255,255,255,0.12)",
                      color:"#94a3b8", fontWeight:"700", fontSize:"14px",
                      padding:"14px", borderRadius:"13px", cursor:"pointer",
                    }}
                  >
                    ✕  CANCEL
                  </button>
                  <button
                    onClick={handleSendNow}
                    style={{
                      background:"#dc2626",
                      border:"none", color:"white",
                      fontWeight:"900", fontSize:"14px",
                      fontFamily:"monospace",
                      padding:"14px", borderRadius:"13px", cursor:"pointer",
                      letterSpacing:"0.04em",
                      boxShadow:"0 4px 24px rgba(220,38,38,0.45)",
                    }}
                  >
                    🆘 SEND NOW
                  </button>
                </>
              )}

              {alertPhase === "sent" && (
                <button
                  onClick={handleCancel}
                  style={{
                    background:"rgba(255,255,255,0.06)",
                    border:"1px solid rgba(255,255,255,0.1)",
                    color:"#94a3b8", fontWeight:"600", fontSize:"13px",
                    padding:"12px", borderRadius:"12px", cursor:"pointer",
                  }}
                >
                  Close
                </button>
              )}
            </div>

          </div>
        </div>
      </motion.div>
    </>
  );
}