import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) setProfile(data);
  }, []);

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
        else setProfile(null);
      }
    );

    // Re-fetch profile when user returns to tab (picks up role changes)
    const handleFocus = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) fetchProfile(session.user.id);
      });
    };
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [fetchProfile]);

  const signIn  = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp  = (email, password, name) =>
    supabase.auth.signUp({ email, password, options: { data: { name } } });

  const signOut = () => supabase.auth.signOut();

  // Expose manual refresh so Header button can trigger it
  const refreshProfile = () => {
    if (user) fetchProfile(user.id);
  };

  const isAdmin = profile?.role?.trim()?.toLowerCase() === "admin";
  console.log("PROFILE:", profile);
  console.log("IS ADMIN:", isAdmin);

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
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};