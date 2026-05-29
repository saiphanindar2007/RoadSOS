import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Navigation2, Phone, Search, MapPin, Clock } from "lucide-react";

// ── Amenity → friendly label ───────────────────────────────
const AMENITY_LABEL = {
  hospital:          "Govt/Private Hospital",
  clinic:            "Private Clinic",
  doctors:           "Doctor / Clinic",
  nursing_home:      "Nursing Home",
  health_centre:     "Health Centre",
  pharmacy:          "Pharmacy",
  police:            "Police Station",
  fire_station:      "Fire Station",
  ambulance_station: "Ambulance Station",
};

const TYPE_CFG = {
  hospital: { emoji:"🏥", border:"border-red-500/25",    bg:"bg-red-500/8",    text:"text-red-400"    },
  police:   { emoji:"🚔", border:"border-blue-500/25",   bg:"bg-blue-500/8",   text:"text-blue-400"   },
  fire:     { emoji:"🚒", border:"border-orange-500/25", bg:"bg-orange-500/8", text:"text-orange-400" },
  pharmacy: { emoji:"💊", border:"border-green-500/25",  bg:"bg-green-500/8",  text:"text-green-400"  },
  other:    { emoji:"📍", border:"border-purple-500/25", bg:"bg-purple-500/8", text:"text-purple-400" },
};

const FILTERS = [
  { id:"all",      label:"All Services",  emoji:"🔍" },
  { id:"hospital", label:"Hospitals",     emoji:"🏥" },
  { id:"police",   label:"Police",        emoji:"🚔" },
  { id:"fire",     label:"Fire & Rescue", emoji:"🚒" },
  { id:"pharmacy", label:"Pharmacy",      emoji:"💊" },
];

const QUICK_DIALS = [
  { num:"112", label:"Emergency",  emoji:"🆘", bg:"bg-red-700"    },
  { num:"108", label:"Ambulance",  emoji:"🚑", bg:"bg-rose-700"   },
  { num:"100", label:"Police",     emoji:"🚔", bg:"bg-blue-700"   },
  { num:"101", label:"Fire",       emoji:"🚒", bg:"bg-orange-600" },
  { num:"1073",label:"Road Acc.",  emoji:"🛣️", bg:"bg-amber-700"  },
  { num:"104", label:"Medical",    emoji:"🏥", bg:"bg-green-700"  },
];

// Navigate URL for Google Maps driving directions
const navUrl = (svc) =>
  `https://www.google.com/maps/dir/?api=1&destination=${svc.lat},${svc.lng}&travelmode=driving`;

// ── Individual service card ────────────────────────────────
function ServiceCard({ svc, index }) {
  const cfg = TYPE_CFG[svc.type] || TYPE_CFG.other;
  return (
    <motion.div
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0  }}
      transition={{ duration:0.22, delay: index * 0.04 }}
      className={`rounded-xl border p-4 ${cfg.border} ${cfg.bg} hover:brightness-110 transition-all`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 bg-slate-800/60 border ${cfg.border}`}>
          {cfg.emoji}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h3 className="font-semibold text-white text-sm leading-tight truncate font-display">
              {svc.name}
            </h3>
            <span className={`text-xs font-mono font-bold flex-shrink-0 ${cfg.text}`}>
              {svc.distance_text}
            </span>
          </div>
          <p className={`text-[11px] font-medium mb-2 ${cfg.text}`}>
            {AMENITY_LABEL[svc.amenity] || svc.type}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-3">
            {svc.address && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={9} />{svc.address}
              </span>
            )}
            <span className="flex items-center gap-1 flex-shrink-0">
              <Clock size={9} />{svc.opening_hours}
            </span>
          </div>
          {/* Action buttons */}
          <div className="flex gap-2">
            {svc.phone && (
              <a href={`tel:${svc.phone}`}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                <Phone size={11} /> {svc.phone}
              </a>
            )}
            <a href={navUrl(svc)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
              <Navigation2 size={11} /> Navigate
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function ServicesList({ services, loading, filter, onFilterChange, onSelect }) {
  const [search, setSearch] = useState("");

  const filtered = services.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (AMENITY_LABEL[s.amenity] || "").toLowerCase().includes(search.toLowerCase())
  );

  const nearest = services[0] ?? null; // closest service (already sorted by distance)

  return (
    <div className="space-y-5 max-w-4xl">

      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold font-display text-white">🚑 Nearby Emergency Services</h2>
        <p className="text-xs text-slate-400 mt-1">
          Real data from OpenStreetMap · auto-refreshes every 250 m you move
        </p>
      </div>

      {/* ── NEAREST SERVICE HERO ──────────────────────────
          Big navigate card — most important for emergencies */}
      {nearest && (
        <motion.div
          initial={{ opacity:0, scale:0.97 }}
          animate={{ opacity:1, scale:1   }}
          className="rounded-2xl border border-red-500/35 overflow-hidden"
          style={{ background: "linear-gradient(135deg,rgba(127,29,29,0.35) 0%,rgba(15,23,42,0.9) 100%)" }}
        >
          <div className="px-4 pt-3 pb-1">
            <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-red-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Nearest Emergency Service
            </div>
          </div>

          <div className="px-4 pb-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-3xl flex-shrink-0">
              {TYPE_CFG[nearest.type]?.emoji || "📍"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold font-display text-white text-base leading-tight truncate">
                {nearest.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {AMENITY_LABEL[nearest.amenity] || nearest.type} ·{" "}
                <span className="text-red-400 font-bold font-mono">{nearest.distance_text} away</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{nearest.opening_hours}</p>
            </div>
          </div>

          {/* Big action buttons */}
          <div className="px-4 pb-4 grid grid-cols-2 gap-3">
            {nearest.phone && (
              <a href={`tel:${nearest.phone}`}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-95">
                <Phone size={15} /> Call {nearest.phone}
              </a>
            )}
            <a href={navUrl(nearest)} target="_blank" rel="noreferrer"
              className={`flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-95 ${!nearest.phone ? "col-span-2" : ""}`}>
              <Navigation2 size={15} /> Navigate in Google Maps
            </a>
          </div>
        </motion.div>
      )}

      {/* ── Quick dial grid ── */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">
          National helplines
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {QUICK_DIALS.map(({ num, label, emoji, bg }) => (
            <a key={num} href={`tel:${num}`}
              className={`${bg} hover:brightness-110 rounded-xl p-2.5 flex flex-col items-center gap-1 transition-all active:scale-95`}>
              <span className="text-xl">{emoji}</span>
              <span className="text-white font-bold font-mono text-sm">{num}</span>
              <span className="text-white/70 text-[9px] text-center leading-tight">{label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => onFilterChange(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              filter === f.id
                ? "bg-red-600 border-red-500 text-white"
                : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
            }`}>
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search hospitals, police, pharmacy…"
          className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500/60 transition-colors"
        />
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 size={15} className="animate-spin text-red-500" />
          Fetching nearby services…
        </div>
      )}

      {/* ── Service cards ── */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-10 text-slate-500 text-sm">
          {search ? `No results for "${search}"` : "No services found in this area."}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((svc, i) => (
          <ServiceCard key={svc.id} svc={svc} index={i} />
        ))}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-slate-600 text-center">
          {filtered.length} services · sorted by distance · data: OpenStreetMap
        </p>
      )}
    </div>
  );
}