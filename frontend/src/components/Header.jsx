import { motion } from "framer-motion";
import { MapPin, LogOut } from "lucide-react";

export default function Header({ onSOS, locationErr, accuracy, onSignOut }) {
  return (
    <header className="sticky top-0 z-40 bg-surface-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <motion.div
            className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-lg shadow-lg shadow-red-900/40"
            animate={{ scale: [1,1.08,1] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          >
            🚨
          </motion.div>
          <div>
            <h1 className="text-base font-bold font-display tracking-tight leading-tight">
              Road<span className="text-red-500">SoS</span>
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-tight">
              AI Emergency Response
            </p>
          </div>
        </div>

        {/* Center — emergency numbers (desktop) */}
        <div className="hidden md:flex items-center gap-5 text-xs text-slate-400">
          {[
            { num:"108", label:"Ambulance", color:"text-red-400"    },
            { num:"100", label:"Police",    color:"text-blue-400"   },
            { num:"101", label:"Fire",      color:"text-orange-400" },
          ].map(({ num, label, color }) => (
            <a key={num} href={`tel:${num}`}
              className="flex items-center gap-1.5 hover:text-white transition-colors group">
              <span className={`font-mono font-bold text-sm ${color}`}>{num}</span>
              <span className="text-slate-500">{label}</span>
            </a>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* GPS accuracy badge */}
          {accuracy != null && (
            <div className={`hidden sm:flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border ${
              accuracy < 20
                ? "text-green-400 bg-green-400/8 border-green-400/20"
                : accuracy < 50
                  ? "text-amber-400 bg-amber-400/8 border-amber-400/20"
                  : "text-slate-400 bg-slate-400/8 border-slate-400/20"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              ±{accuracy}m
            </div>
          )}

          {/* Default location warning */}
          {locationErr && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/8 px-2 py-1 rounded-full border border-amber-400/20">
              <MapPin size={10} /> Default location
            </div>
          )}

          {/* SOS button */}
          <button onClick={onSOS}
            className="sos-btn bg-red-600 hover:bg-red-500 text-white font-bold font-display text-sm px-4 py-2 rounded-xl transition-colors">
            SOS
          </button>

          {/* Logout */}
          {onSignOut && (
            <button onClick={onSignOut}
              title="Sign out"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center border border-slate-700">
              <LogOut size={15} />
            </button>
          )}
        </div>

      </div>
    </header>
  );
}