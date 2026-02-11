"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  credits: number;
  loading: boolean;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  credits: 0,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshCredits: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const fetchCredits = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();
      if (data) setCredits(Number(data.credits));
    },
    [supabase],
  );

  useEffect(() => {
    // Don't block loading on credits — resolve auth first, then fetch credits in background
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        fetchCredits(currentUser.id).catch(() => {});
      } else {
        setCredits(0);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchCredits]);

  const signInWithGoogle = async (redirectTo?: string) => {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (redirectTo) {
      callbackUrl.searchParams.set("next", redirectTo);
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCredits(0);
  };

  const refreshCredits = async () => {
    if (user) await fetchCredits(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ user, credits, loading, signInWithGoogle, signOut, refreshCredits }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
