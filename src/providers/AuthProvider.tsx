// Contexte d'authentification du portail.
// Rôle : exposer la session Supabase (persistée en localStorage par le client)
// + un garde <RequireAuth> qui renvoie vers /connexion?next=... si besoin.
// La session est créée par le flux OTP (ConnexionPage → supabase.auth.setSession).

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Navigate, useLocation } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextValue {
  session: Session | null;
  /** true tant que la session initiale n'a pas été lue depuis le storage. */
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) setSession(next);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

/** Garde de route : redirige vers /connexion?next=<chemin courant> si déconnecté. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="section container" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p style={{ textAlign: "center" }}>Un instant, on flaire ta session…</p>
      </div>
    );
  }
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/connexion?next=${next}`} replace />;
  }
  return <>{children}</>;
}
