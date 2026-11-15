import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  LayoutDashboard,
  Sparkles,
  FileInput,
  History,
  BookMarked,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ArrowUpRight,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../app/Auth";
import { api } from "../lib/api";
export function Preferences() {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const [theme, setTheme] = useState(
    localStorage.getItem("studylab:theme") || "light",
  );
  const [error, setError] = useState(false);
  async function persist(values: { language?: string; theme?: string }) {
    if (user)
      try {
        await api.preferences(user.id, values);
        setError(false);
      } catch {
        setError(true);
      }
  }
  return (
    <div className="preferences">
      <select
        aria-label={t("language")}
        value={i18n.language}
        onChange={(e) => {
          void i18n.changeLanguage(e.target.value);
          void persist({ language: e.target.value });
        }}
      >
        <option value="ko">한국어</option>
        <option value="vi">Tiếng Việt</option>
      </select>
      <button
        className="icon-btn"
        title={t("theme")}
        aria-label={t("theme")}
        onClick={() => {
          const next = theme === "light" ? "dark" : "light";
          setTheme(next);
          document.documentElement.dataset.theme = next;
          localStorage.setItem("studylab:theme", next);
          void persist({ theme: next });
        }}
      >
        {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
      </button>
      {error && (
        <span role="alert" className="small">
          {t("error")}
        </span>
      )}
    </div>
  );
}
export function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-icon">
        <GraduationCap size={25} />
      </span>
      <span>
        AI StudyLab<small>LEARN. PRACTICE. GROW.</small>
      </span>
    </Link>
  );
}
export function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const items = [
    ["/", "dashboard", LayoutDashboard],
    ["/lessons", "lessons", BookOpen],
    ["/history", "history", History],
    ["/notebook", "notebook", BookMarked],
    ["/prompt", "prompt", Sparkles],
    ["/import", "import", FileInput],
  ] as const;
  return (
    <div className="app-shell">
      {open && (
        <button
          className="overlay"
          aria-label={t("closeMenu")}
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={open ? "sidebar open" : "sidebar"}>
        <Brand />
        <p className="sidebar-caption">{t("workspace")}</p>
        <nav>
          {items.map(([path, key, Icon], i) => (
            <div key={path}>
              {i === 4 && <p className="sidebar-caption">{t("tools")}</p>}
              <NavLink
                to={path}
                end={path === "/"}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} />
                {t(key)}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy">
            <ShieldCheck size={21} />
            <p>
              {t("private")}
              <small>SUPABASE · RLS</small>
            </p>
          </div>
          <NavLink to="/settings">
            <Settings size={18} />
            {t("settings")}
          </NavLink>
          <button className="nav-button" onClick={() => void logout()}>
            <LogOut size={18} />
            {t("logout")}
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            aria-label={t(open ? "closeMenu" : "menu")}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <span className="topbar-label">{t("appTag")}</span>
          <div className="topbar-right">
            <Preferences />
            <Link className="avatar" to="/settings" aria-label={t("profile")}>
              {(user?.user_metadata?.display_name || user?.email || "S")
                .slice(0, 1)
                .toUpperCase()}
            </Link>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <footer>
          AI StudyLab <span>·</span> {t("university")}
          <Link to="/prompt">
            {t("noAI")} <ArrowUpRight size={12} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
