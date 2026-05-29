/**
 * MedicalIDCard — Digital Emergency Medical ID
 * User fills in: name, age, blood group, allergies, conditions,
 *   medications, emergency contact.
 * Stored in localStorage (device-only, private).
 * Generates a QR code via qrserver.com API (no key needed).
 * First responders scan the QR to get full medical info.
 * "View Card" shows a printable medical card modal.
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Edit3, X, Printer, ShieldCheck, AlertTriangle } from "lucide-react";

const STORAGE_KEY = "roadsos_medical_id_v2";
const BLOOD_TYPES = ["A+","A-","B+","B-","AB+","AB-","O+","O-","Unknown"];

const EMPTY = {
  name: "", age: "", blood: "O+",
  allergies: "", conditions: "", medications: "",
  emergencyName: "", emergencyPhone: "",
  organDonor: false,
};

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || EMPTY; }
  catch { return EMPTY; }
}

function buildQR(d) {
  const info =
    `ROADSOS MEDICAL ID%0A` +
    `Name:${d.name} Age:${d.age}%0A` +
    `Blood:${d.blood}%0A` +
    `Allergies:${d.allergies||"None"}%0A` +
    `Conditions:${d.conditions||"None"}%0A` +
    `Medications:${d.medications||"None"}%0A` +
    `Emergency:${d.emergencyName} ${d.emergencyPhone}%0A` +
    `OrganDonor:${d.organDonor?"YES":"NO"}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${info}&bgcolor=0f172a&color=f1f5f9&margin=6`;
}

// A single form field row
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white " +
  "placeholder-slate-500 focus:outline-none focus:border-red-500/60 transition-colors";

export default function MedicalIDCard() {
  const [data,     setData]     = useState(loadData);
  const [editing,  setEditing]  = useState(!loadData().name);
  const [showCard, setShowCard] = useState(false);
  const [saved,    setSaved]    = useState(false);

  const set = (key, val) => setData((d) => ({ ...d, [key]: val }));

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const qrUrl    = buildQR(data);
  const hasData  = !!data.name;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold font-display text-white text-base flex items-center gap-2">
            🪪 Emergency Medical ID
            {hasData && !editing && (
              <span className="text-[10px] bg-green-500/15 border border-green-500/25 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck size={10} /> Saved
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            First responders scan your QR code for instant medical info
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {hasData && !editing && (
            <button
              onClick={() => setShowCard(true)}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              View Card
            </button>
          )}
          <button
            onClick={() => (editing ? save() : setEditing(true))}
            className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {editing ? <><Save size={12} /> Save</> : <><Edit3 size={12} /> Edit</>}
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="glass rounded-2xl border border-slate-700/50 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Full Name">
              <input className={inputCls} placeholder="Venkata Ravi"
                value={data.name} onChange={e => set("name", e.target.value)} />
            </Field>
            <Field label="Age">
              <input className={inputCls} type="number" placeholder="25"
                value={data.age} onChange={e => set("age", e.target.value)} />
            </Field>
            <Field label="Blood Group">
              <select className={inputCls} value={data.blood}
                onChange={e => set("blood", e.target.value)}>
                {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="⚠️ Allergies (drug, food, other)">
              <input className={inputCls} placeholder="Penicillin, Shellfish, Latex"
                value={data.allergies} onChange={e => set("allergies", e.target.value)} />
            </Field>
            <Field label="🏥 Medical Conditions">
              <input className={inputCls} placeholder="Diabetes Type 2, Hypertension"
                value={data.conditions} onChange={e => set("conditions", e.target.value)} />
            </Field>
            <Field label="💊 Current Medications">
              <input className={inputCls} placeholder="Metformin 500mg, Amlodipine 5mg"
                value={data.medications} onChange={e => set("medications", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Emergency Contact Name">
                <input className={inputCls} placeholder="Sunita Devi"
                  value={data.emergencyName} onChange={e => set("emergencyName", e.target.value)} />
              </Field>
              <Field label="Emergency Phone">
                <input className={inputCls} type="tel" placeholder="9876543210"
                  value={data.emergencyPhone} onChange={e => set("emergencyPhone", e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Organ donor toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => set("organDonor", !data.organDonor)}
              className={`w-10 h-5 rounded-full transition-colors relative ${data.organDonor ? "bg-green-600" : "bg-slate-700"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${data.organDonor ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
              🫀 Organ Donor
            </span>
          </label>

          {saved && (
            <div className="text-center text-xs text-green-400 bg-green-500/10 py-2 rounded-lg border border-green-500/20">
              ✅ Medical ID saved to your device
            </div>
          )}

          <button
            onClick={save}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold font-display py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Save size={15} /> Save Emergency Medical ID
          </button>
          <p className="text-[10px] text-slate-500 text-center">
            🔒 All data is stored locally on your device only — never sent anywhere
          </p>
        </div>
      )}

      {/* Compact preview */}
      {!editing && hasData && (
        <div className="glass rounded-2xl border border-slate-700/50 p-4 flex items-start gap-4">
          <img src={qrUrl} alt="Medical ID QR" className="w-20 h-20 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div>
              <div className="text-[10px] text-slate-500">Name</div>
              <div className="text-white font-medium truncate">{data.name}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Age · Blood</div>
              <div className="text-white">
                {data.age} yrs · <span className="text-red-400 font-bold">{data.blood}</span>
              </div>
            </div>
            {data.allergies && (
              <div className="col-span-2">
                <div className="text-[10px] text-slate-500">Allergies</div>
                <div className="text-amber-400 text-xs">{data.allergies}</div>
              </div>
            )}
            {data.emergencyPhone && (
              <div className="col-span-2">
                <div className="text-[10px] text-slate-500">Emergency</div>
                <div className="text-green-400 text-xs">{data.emergencyName} · {data.emergencyPhone}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!editing && !hasData && (
        <button
          onClick={() => setEditing(true)}
          className="w-full glass border border-dashed border-slate-600 hover:border-red-500/40 rounded-2xl py-8 text-slate-400 hover:text-white transition-all text-sm"
        >
          + Create Your Emergency Medical ID
          <div className="text-xs text-slate-500 mt-1">
            First responders will thank you
          </div>
        </button>
      )}

      {/* Full printable card modal */}
      <AnimatePresence>
        {showCard && hasData && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCard(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-sm">
                {/* Card */}
                <div
                  id="medical-card-print"
                  className="rounded-3xl overflow-hidden shadow-2xl"
                  style={{
                    background: "linear-gradient(135deg, #0f172a 0%, #1e0a0a 100%)",
                    border: "1px solid rgba(239,68,68,0.3)",
                  }}
                >
                  {/* Red header bar */}
                  <div className="bg-gradient-to-r from-red-700 to-red-800 px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl">🆘</div>
                      <div>
                        <div className="text-white font-bold font-display text-sm tracking-tight">
                          EMERGENCY MEDICAL ID
                        </div>
                        <div className="text-red-200 text-[10px]">RoadSoS · AI Road Safety</div>
                      </div>
                    </div>
                    <button onClick={() => setShowCard(false)} className="text-red-200 hover:text-white">
                      <X size={17} />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Identity */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
                      >
                        🩸
                      </div>
                      <div>
                        <div className="text-xl font-bold font-display text-white">{data.name}</div>
                        <div className="text-slate-300 text-sm">{data.age} years old</div>
                        <div
                          className="text-2xl font-bold font-mono mt-0.5"
                          style={{ color: "#f87171" }}
                        >
                          {data.blood}
                        </div>
                      </div>
                    </div>

                    {/* Alert blocks */}
                    {data.allergies && (
                      <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "12px", padding: "12px" }}>
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <AlertTriangle size={9} /> Allergies — DO NOT ADMINISTER
                        </div>
                        <div className="text-amber-200 text-sm">{data.allergies}</div>
                      </div>
                    )}

                    {data.conditions && (
                      <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "12px", padding: "12px" }}>
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">🏥 Medical Conditions</div>
                        <div className="text-blue-200 text-sm">{data.conditions}</div>
                      </div>
                    )}

                    {data.medications && (
                      <div style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "12px", padding: "12px" }}>
                        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">💊 Current Medications</div>
                        <div className="text-purple-200 text-sm">{data.medications}</div>
                      </div>
                    )}

                    {data.emergencyPhone && (
                      <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "12px", padding: "12px" }}>
                        <div className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1">📞 Emergency Contact</div>
                        <div className="text-white font-medium">{data.emergencyName}</div>
                        <a href={`tel:${data.emergencyPhone}`} className="text-green-400 font-mono">{data.emergencyPhone}</a>
                      </div>
                    )}

                    {data.organDonor && (
                      <div className="text-center text-sm text-green-400 bg-green-500/10 rounded-xl py-2 border border-green-500/20">
                        🫀 Registered Organ Donor
                      </div>
                    )}

                    {/* QR + note */}
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <img src={qrUrl} alt="QR" className="w-20 h-20 rounded-lg" />
                      <div className="text-xs text-slate-400">
                        <div className="font-bold text-white mb-1">Scan for Full Info</div>
                        <div className="text-[11px] leading-relaxed">
                          First responders — scan this QR code to access complete medical information
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Print hint */}
                <p className="text-center text-xs text-slate-500 mt-3">
                  📸 Screenshot this card and save it to your photo gallery
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}