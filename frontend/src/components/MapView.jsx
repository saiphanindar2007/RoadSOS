import { useState, useCallback, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import RiskIndex from "./RiskIndex";

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const DARK_STYLE = [
  { elementType:"geometry",            stylers:[{color:"#0f172a"}] },
  { elementType:"labels.icon",         stylers:[{visibility:"off"}] },
  { elementType:"labels.text.fill",    stylers:[{color:"#64748b"}] },
  { elementType:"labels.text.stroke",  stylers:[{color:"#0f172a"}] },
  { featureType:"administrative",          elementType:"geometry",          stylers:[{color:"#1e293b"}] },
  { featureType:"administrative.country",  elementType:"labels.text.fill",  stylers:[{color:"#94a3b8"}] },
  { featureType:"administrative.locality", elementType:"labels.text.fill",  stylers:[{color:"#e2e8f0"}] },
  { featureType:"poi",                     elementType:"labels.text.fill",  stylers:[{color:"#475569"}] },
  { featureType:"poi.park",                elementType:"geometry",          stylers:[{color:"#0d1f35"}] },
  { featureType:"road",                    elementType:"geometry",          stylers:[{color:"#1e293b"}] },
  { featureType:"road",                    elementType:"geometry.stroke",   stylers:[{color:"#0f172a"}] },
  { featureType:"road",                    elementType:"labels.text.fill",  stylers:[{color:"#64748b"}] },
  { featureType:"road.highway",            elementType:"geometry",          stylers:[{color:"#2d3f55"}] },
  { featureType:"road.highway",            elementType:"labels.text.fill",  stylers:[{color:"#94a3b8"}] },
  { featureType:"water",                   elementType:"geometry",          stylers:[{color:"#071220"}] },
];

// ── Reliable color map (no SVG needed) ────────────────────
const TYPE_COLOR = {
  hospital: "#dc2626",  // red
  police:   "#2563eb",  // blue
  fire:     "#ea580c",  // orange
  pharmacy: "#16a34a",  // green
  other:    "#7c3aed",  // purple
};

const TYPE_CFG = {
  hospital: { emoji:"🏥", label:"Hospital / Clinic"  },
  police:   { emoji:"🚔", label:"Police Station"      },
  fire:     { emoji:"🚒", label:"Fire & Rescue"       },
  pharmacy: { emoji:"💊", label:"Pharmacy"            },
  other:    { emoji:"📍", label:"Emergency Service"   },
};

const AMENITY_LABEL = {
  hospital:"Hospital", clinic:"Clinic", doctors:"Doctor / Clinic",
  nursing_home:"Nursing Home", health_centre:"Health Centre",
  pharmacy:"Pharmacy", police:"Police Station",
  fire_station:"Fire Station", ambulance_station:"Ambulance",
};

// InfoWindow content styles (renders outside React)
const IW = {
  wrap:   { background:"#1e293b",border:"1px solid #334155",borderRadius:"12px",
            padding:"14px",minWidth:"210px",fontFamily:"system-ui,sans-serif" },
  type:   { fontSize:"10px",fontWeight:"700",textTransform:"uppercase",
            letterSpacing:"0.08em",color:"#64748b",marginBottom:"3px" },
  name:   { fontWeight:"700",color:"#f1f5f9",fontSize:"13px",marginBottom:"2px" },
  dist:   { color:"#64748b",fontSize:"11px",marginBottom:"10px" },
  call:   { display:"block",textAlign:"center",background:"#dc2626",color:"white",
            fontWeight:"700",fontSize:"13px",padding:"8px",borderRadius:"8px",
            textDecoration:"none",marginBottom:"6px" },
  nav:    { display:"block",textAlign:"center",background:"#1d4ed8",color:"white",
            fontWeight:"600",fontSize:"12px",padding:"7px",borderRadius:"8px",
            textDecoration:"none" },
};

const FILTERS = [
  { id:"all",      label:"All",        emoji:"🔍" },
  { id:"hospital", label:"Hospitals",  emoji:"🏥" },
  { id:"police",   label:"Police",     emoji:"🚔" },
  { id:"fire",     label:"Fire",       emoji:"🚒" },
  { id:"pharmacy", label:"Pharmacy",   emoji:"💊" },
];

const MAP_OPTIONS = {
  styles:DARK_STYLE, disableDefaultUI:false,
  zoomControl:true, mapTypeControl:true,
  mapTypeControlOptions:{ style:2 },
  streetViewControl:true, fullscreenControl:true,
  gestureHandling:"cooperative", clickableIcons:false,
};

export default function MapView({ location, services, filter, onFilterChange, onSelectService, loading }) {
  const [activeMarker, setActiveMarker] = useState(null);
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GMAPS_KEY,
  });

  const onMapLoad = useCallback((map) => { mapRef.current = map; }, []);

  // ── Smooth pan whenever GPS position updates ───────────
  useEffect(() => {
    if (mapRef.current && location) {
      mapRef.current.panTo({ lat: location.lat, lng: location.lng });
    }
  }, [location?.lat, location?.lng]); // eslint-disable-line

  if (loadError) {
    return (
      <div className="space-y-4">
        <RiskIndex />
        <div className="flex flex-col items-center justify-center h-[460px] glass rounded-2xl border border-red-900/30 gap-3">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-red-400">Google Maps failed — check VITE_GOOGLE_MAPS_API_KEY in .env</p>
        </div>
      </div>
    );
  }

  if (!isLoaded || !location) {
    return (
      <div className="space-y-4">
        <RiskIndex />
        <div className="flex items-center justify-center h-[460px] glass rounded-2xl border border-slate-700/50">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 size={28} className="animate-spin text-red-500" />
            <p className="text-sm">{!isLoaded ? "Loading Google Maps…" : "Getting your location…"}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── SymbolPath icons — 100% reliable, no URLs needed ──
  // USER LOCATION: large blue circle (clearly visible)
  const userDotIcon = {
    path:         window.google.maps.SymbolPath.CIRCLE,
    scale:        14,
    fillColor:    "#3b82f6",
    fillOpacity:  1,
    strokeColor:  "#ffffff",
    strokeWeight: 3.5,
    strokeOpacity:1,
  };

  // USER LOCATION ring: outer glow circle
  const userRingIcon = {
    path:         window.google.maps.SymbolPath.CIRCLE,
    scale:        24,
    fillColor:    "#3b82f6",
    fillOpacity:  0.12,
    strokeColor:  "#3b82f6",
    strokeWeight: 1.5,
    strokeOpacity:0.35,
  };

  // SERVICE MARKER
  const svcIcon = (type, isNearest = false) => ({
    path:         window.google.maps.SymbolPath.CIRCLE,
    scale:        isNearest ? 16 : 12,
    fillColor:    TYPE_COLOR[type] || TYPE_COLOR.other,
    fillOpacity:  1,
    strokeColor:  "#ffffff",
    strokeWeight: isNearest ? 3.5 : 2.5,
    strokeOpacity:1,
  });

  const nearestId = services[0]?.id;

  return (
    <div className="space-y-4">
      <RiskIndex />

      {/* Filters + live badge */}
      <div className="flex flex-wrap gap-2 items-center">
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
        <div className="ml-auto flex items-center gap-1.5 text-xs">
          {loading
            ? <span className="text-slate-400 flex items-center gap-1.5"><Loader2 size={11} className="animate-spin"/>Updating…</span>
            : <span className="text-green-400 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>Live tracking ON
              </span>
          }
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        {Object.entries(TYPE_CFG).filter(([k])=>k!=="other").map(([,c])=>(
          <div key={c.label} className="flex items-center gap-1">{c.emoji} {c.label}</div>
        ))}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl" style={{height:"460px"}}>
        <GoogleMap
          mapContainerStyle={{width:"100%",height:"100%"}}
          center={{lat:location.lat, lng:location.lng}}
          zoom={14}
          options={MAP_OPTIONS}
          onLoad={onMapLoad}
          onClick={() => setActiveMarker(null)}
        >
          {/* ── Outer glow ring for user location ── */}
          <Marker
            position={{lat:location.lat, lng:location.lng}}
            icon={userRingIcon}
            zIndex={28}
            clickable={false}
          />

          {/* ── Blue dot — user's live location ── */}
          <Marker
            position={{lat:location.lat, lng:location.lng}}
            icon={userDotIcon}
            title="📍 You are here"
            zIndex={30}
          />

          {/* ── 1 km radius circle ── */}
          <Circle
            center={{lat:location.lat, lng:location.lng}}
            radius={1000}
            options={{
              strokeColor:"#3b82f6", strokeOpacity:0.4, strokeWeight:1.5,
              fillColor:"#3b82f6",   fillOpacity:0.04,
            }}
          />

          {/* ── Service markers ── */}
          {services.map(svc => (
            <Marker
              key={svc.id}
              position={{lat:svc.lat, lng:svc.lng}}
              icon={svcIcon(svc.type, svc.id === nearestId)}
              title={`${TYPE_CFG[svc.type]?.emoji} ${svc.name} — ${svc.distance_text}`}
              zIndex={svc.id === nearestId ? 20 : 10}
              onClick={() => setActiveMarker(svc)}
            />
          ))}

          {/* ── Info Window ── */}
          {activeMarker && (
            <InfoWindow
              position={{lat:activeMarker.lat, lng:activeMarker.lng}}
              onCloseClick={() => setActiveMarker(null)}
              options={{pixelOffset: new window.google.maps.Size(0,-16), maxWidth:260}}
            >
              <div style={IW.wrap}>
                <div style={IW.type}>{AMENITY_LABEL[activeMarker.amenity]||TYPE_CFG[activeMarker.type]?.label}</div>
                <div style={IW.name}>{activeMarker.name}</div>
                <div style={IW.dist}>
                  {activeMarker.id === nearestId && "⭐ Nearest · "}
                  {activeMarker.distance_text} away · {activeMarker.opening_hours}
                </div>
                {activeMarker.phone && (
                  <a href={`tel:${activeMarker.phone}`} style={IW.call}>
                    📞 Call {activeMarker.phone}
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeMarker.lat},${activeMarker.lng}&travelmode=driving`}
                  target="_blank" rel="noreferrer"
                  style={IW.nav}
                >
                  🗺️ Navigate in Google Maps
                </a>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>
          <span className="text-white font-medium">{services.length}</span> services within 5 km ·
          re-fetches every 250 m you move
        </span>
        <span>Powered by Google Maps</span>
      </div>
    </div>
  );
}