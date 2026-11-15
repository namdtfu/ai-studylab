import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { Navigate, useLocation } from "react-router-dom";
import { supabase, initialRecovery } from "../lib/supabase";
import { api } from "../lib/api";
import i18n from "../i18n";
import { clearUserDrafts } from "../lib/draft";
import { useTranslation } from "react-i18next";
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  recovery: boolean;
  logout: () => Promise<void>;
}>({ user: null, loading: true, recovery: false, logout: async () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [recovery, setRecovery] = useState(initialRecovery);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let alive = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (alive) {
        setUser(error ? null : (data.session?.user ?? null));
        setLoading(false);
      }
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    api
      .profile()
      .then((p) => {
        if (alive) {
          void i18n.changeLanguage(p.language);
          document.documentElement.dataset.theme = p.theme;
          localStorage.setItem("studylab:theme", p.theme);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user?.id]);
  async function logout() {
    if (user) clearUserDrafts(user.id);
    await supabase?.auth.signOut();
    setUser(null);
  }
  return (
    <AuthContext.Provider value={{ user, loading, recovery, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
export function Protected({ children }: { children: ReactNode }) {
  const { user, loading, recovery } = useAuth();
  const { t } = useTranslation();
  const loc = useLocation();
  if (loading) return <div className="loading">{t("loading")}</div>;
  if (!user)
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (recovery && loc.pathname !== "/reset-password")
    return <Navigate to="/reset-password" replace />;
  return <Fragment key={user.id}>{children}</Fragment>;
}
