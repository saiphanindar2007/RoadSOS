/**
 * VoiceSOS — Web Speech API voice trigger
 * Click microphone → speak → say any trigger word → SOS fires
 * Trigger words: help, emergency, accident, sos, hurt, crash, mayday
 * Works in Chrome, Edge, Safari (not Firefox)
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

const TRIGGER_WORDS = ["help", "emergency", "accident", "sos", "hurt", "crash", "mayday"];

export default function VoiceSOS({ onTrigger }) {
  const [listening,  setListening]  = useState(false);
  const [transcript, setTranscript] = useState("");
  const [triggered,  setTriggered]  = useState(false);
  const [supported,  setSupported]  = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);

    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = "en-IN";

    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .toLowerCase();
      setTranscript(text.slice(-60));

      if (TRIGGER_WORDS.some((w) => text.includes(w))) {
        setTriggered(true);
        rec.stop();
        setListening(false);
        setTimeout(() => {
          onTrigger?.();
          setTriggered(false);
          setTranscript("");
        }, 700);
      }
    };

    rec.onerror = () => { setListening(false); setTranscript(""); };
    rec.onend   = () => setListening(false);
    recRef.current = rec;
  }, [onTrigger]);

  const toggle = () => {
    if (!supported) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      setTranscript("");
    } else {
      try {
        recRef.current?.start();
        setListening(true);
      } catch {}
    }
  };

  if (!supported) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
      {/* Transcript bubble */}
      <AnimatePresence>
        {listening && transcript && (
          <motion.div
            key="transcript"
            initial={{ opacity: 0, x: 16, scale: 0.9 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{ opacity: 0, x: 16 }}
            className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-300 max-w-[190px] text-right shadow-xl"
          >
            <div className="text-[9px] text-slate-500 mb-0.5 uppercase tracking-wider">Hearing…</div>
            "{transcript}"
          </motion.div>
        )}
        {triggered && (
          <motion.div
            key="triggered"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.05 }}
            exit={{ opacity: 0 }}
            className="bg-red-600 border border-red-400 rounded-xl px-3 py-2 text-xs text-white font-bold shadow-xl"
          >
            🆘 VOICE TRIGGER DETECTED
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        title={listening ? "Listening — say HELP or EMERGENCY" : "Enable Voice SOS"}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          listening ? "bg-green-600 shadow-green-900/50" : "bg-slate-700 hover:bg-slate-600 shadow-black/40"
        }`}
      >
        {listening ? (
          <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}>
            <Mic size={18} className="text-white" />
          </motion.div>
        ) : (
          <MicOff size={17} className="text-slate-300" />
        )}
      </motion.button>
      <div className="text-[9px] text-slate-500 text-center w-12">
        {listening ? "🎙️ Active" : "Voice SOS"}
      </div>
    </div>
  );
}