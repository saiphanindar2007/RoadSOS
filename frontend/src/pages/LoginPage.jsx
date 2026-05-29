import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode,     setMode]     = useState("login"); // "login" | "signup"
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const inp =
    "w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white " +
    "placeholder-slate-500 focus:outline-none focus:border-red-500/60 transition-colors";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email || !password) { setError("Email and password are required."); return; }
    if (mode === "signup" && !name.trim()) { setError("Name is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error: err } = await signIn(email, password);
        if (err) setError(err.message);
      } else {
        const { error: err } = await signUp(email, password, name.trim());
        if (err) setError(err.message);
        else setSuccess("Account created! Check your email to confirm, then log in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, #1a0505 0%, #030712 60%)" }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: "linear-gradient(#ef4444 1px,transparent 1px),linear-gradient(90deg,#ef4444 1px,transparent 1px)", backgroundSize: "40px 40px" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="w-full max-w-sm relative"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center text-3xl mx-auto mb-4 shadow-2xl shadow-red-900/60"
          >
            🚨
          </motion.div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Road<span className="text-red-500">SoS</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">AI Emergency Response</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl border border-slate-700/50 p-7 shadow-2xl">
          {/* Mode toggle */}
          <div className="flex bg-slate-800/60 rounded-xl p-1 mb-6">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === m
                    ? "bg-red-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {mode === "signup" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Full Name</label>
                    <input
                      className={inp}
                      placeholder="Venkata Ravi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
              <input
                type="email"
                className={inp}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  className={inp + " pr-11"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl p-3"
                >
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-green-400 bg-green-900/20 border border-green-800/30 rounded-xl p-3"
                >
                  ✅ {success}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold font-display py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> {mode === "login" ? "Signing in…" : "Creating account…"}</>
              ) : (
                mode === "login" ? "Sign In →" : "Create Account →"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-5">
            By continuing you agree to use RoadSoS responsibly for road safety purposes.
          </p>
        </div>

        {/* Demo hint */}
        <p className="text-center text-xs text-slate-600 mt-4">
          Admin? Run in Supabase SQL:{" "}
          <code className="text-amber-600">UPDATE profiles SET role='admin' WHERE email='youremail@...'</code>
        </p>
      </motion.div>
    </div>
  );
}