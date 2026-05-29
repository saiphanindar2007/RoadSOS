import { motion } from "framer-motion";
import { Phone, MapPin, Clock, ExternalLink } from "lucide-react";

const TYPE_STYLE = {
  hospital: { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400",    emoji: "🏥" },
  police:   { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400",   emoji: "🚔" },
  fire:     { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", emoji: "🚒" },
  pharmacy: { bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-400",  emoji: "💊" },
  other:    { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", emoji: "📍" },
};

export default function ServiceCard({ service, onSelect, index = 0 }) {
  const style = TYPE_STYLE[service.type] || TYPE_STYLE.other;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={`glass rounded-xl p-4 border ${style.border} hover:border-opacity-60 cursor-pointer transition-all hover:shadow-lg group`}
      onClick={() => onSelect?.(service)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${style.bg} border ${style.border}`}>
          {style.emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white text-sm leading-tight truncate font-display group-hover:text-red-300 transition-colors">
              {service.name}
            </h3>
            <span className={`text-xs font-mono font-bold flex-shrink-0 ${style.text}`}>
              {service.distance_text}
            </span>
          </div>

          <div className="mt-1.5 space-y-1">
            {service.address && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin size={10} className="flex-shrink-0" />
                <span className="truncate">{service.address}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={10} className="flex-shrink-0" />
              <span>{service.opening_hours}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            {service.phone ? (
              <a
                href={`tel:${service.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                <Phone size={11} />
                {service.phone}
              </a>
            ) : null}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lng}&travelmode=driving`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink size={11} />
              Navigate
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}