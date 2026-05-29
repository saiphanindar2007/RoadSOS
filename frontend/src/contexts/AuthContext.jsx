import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch profile with auto-create on first login ──────
  const fetchProfile = useCallback(async (userId) => {
    try {
      // maybeSingle() never throws — returns null if no row
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, role, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (data) { setProfile(data); return; }

      // Profile row missing (can happen on first signup) → create it
      const { data: { user: u } } = await supabase.auth.getUser();
      const { data: created } = await supabase
        .from("profiles")
        .upsert({
          id:   userId,
          email: u?.email ?? "",
          name:  u?.user_metadata?.name ?? (u?.email ?? "").split("@")[0],
          role: "user",
        }, { onConflict: "id" })
        .select()
        .maybeSingle();

      if (created) setProfile(created);
    } catch (e) {
      console.warn("fetchProfile error:", e.message);
    }
  }, []);

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
        else { setProfile(null); }
      }
    );

    // Re-fetch profile when user switches back to this tab
    // (picks up role changes made in Supabase SQL editor)
    const onVisible = () => {
      if (document.visibilityState === "visible")
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) fetchProfile(session.user.id);
        });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchProfile]);

  const signIn  = (e, p) => supabase.auth.signInWithPassword({ email: e, password: p });
  const signUp  = (e, p, n) =>
    supabase.auth.signUp({ email: e, password: p, options: { data: { name: n } } });
  const signOut = () => supabase.auth.signOut();
  const refreshProfile = () => { if (user) fetchProfile(user.id); };

  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider value={{
      user, profile, loading, isAdmin,
      signIn, signUp, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
};