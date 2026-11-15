import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Brand, Preferences } from "../components/Layout";
import { useAuth } from "../app/Auth";
import {
  client,
  configured,
  authRedirect,
  authLinkFailed,
} from "../lib/supabase";
type Values = { email: string; password: string; name: string };
export function AuthPage({
  mode,
}: {
  mode: "login" | "register" | "forgot" | "reset";
}) {
  const { t } = useTranslation();
  const { user, recovery } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>();
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const query = new URLSearchParams(location.hash.slice(1));
    if (authLinkFailed || query.has("error_description"))
      setError("authLinkError");
  }, []);
  if (user && mode !== "reset")
    return <Navigate to={recovery ? "/reset-password" : "/"} replace />;
  async function submit(v: Values) {
    setError("");
    setMessage("");
    try {
      const c = client();
      if (mode === "login") {
        const r = await c.auth.signInWithPassword({
          email: v.email,
          password: v.password,
        });
        if (r.error) throw r.error;
        navigate("/");
      }
      if (mode === "register") {
        const r = await c.auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            emailRedirectTo: authRedirect(),
            data: { display_name: v.name },
          },
        });
        if (r.error) throw r.error;
        setMessage("checkEmail");
      }
      if (mode === "forgot") {
        const r = await c.auth.resetPasswordForEmail(v.email, {
          redirectTo: authRedirect(),
        });
        if (r.error) throw r.error;
        setMessage("resetSent");
      }
      if (mode === "reset") {
        const r = await c.auth.updateUser({ password: v.password });
        if (r.error) throw r.error;
        await c.auth.signOut();
        navigate("/login");
      }
    } catch {
      setError(configured ? "authError" : "notConfigured");
    }
  }
  const title =
    mode === "login"
      ? "welcome"
      : mode === "register"
        ? "createAccount"
        : mode === "forgot"
          ? "forgot"
          : "reset";
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="story-body">
          <p className="eyebrow mint">
            <span className="tiny-dot" /> {t("personalLab")}
          </p>
          <h1>{t("heroTitle")}</h1>
          <p className="story-description">{t("heroBody")}</p>
          <div className="learning-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-center">
              <Graduation />
            </div>
            <span className="art-chip chip-one">
              <Sparkles size={19} /> AI → JSON
            </span>
            <span className="art-chip chip-two">
              <CheckCircle2 size={19} /> LEARN & GROW
            </span>
            <span className="art-math">∂f / ∂x</span>
            <span className="art-star">✳</span>
          </div>
          <div className="story-steps">
            {[BookOpen, Layers, CheckCircle2].map((Icon, i) => (
              <div key={i}>
                <span>0{i + 1}</span>
                <Icon size={18} />
                <p>{t(`step${i + 1}`)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="story-foot">
          <ShieldCheck size={16} />
          {t("private")}
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-top">
          <Preferences />
        </div>
        <div className="auth-form-wrap">
          <span className="pill">AI 중심세상</span>
          <h2>
            {t(title)}
            <span className="title-dot">.</span>
          </h2>
          <p className="muted">{t("loginSub")}</p>
          {!configured && (
            <div className="notice setup" role="status">
              <ShieldCheck size={22} />
              <div>
                <strong>{t("notConfigured")}</strong>
                <p>{t("setupNotice")}</p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit(submit)}>
            {mode === "register" && (
              <label>
                {t("name")}
                <input
                  autoComplete="name"
                  {...register("name", { required: true, maxLength: 100 })}
                />
                {errors.name && (
                  <small className="field-error">{t("required")}</small>
                )}
              </label>
            )}
            {mode !== "reset" && (
              <label>
                {t("email")}
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.ac.kr"
                  {...register("email", { required: true })}
                />
                {errors.email && (
                  <small className="field-error">{t("required")}</small>
                )}
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                {t(mode === "reset" ? "newPassword" : "password")}
                <input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  {...register("password", {
                    required: true,
                    minLength: mode === "login" ? 1 : 8,
                  })}
                />
                {errors.password && (
                  <small className="field-error">{t("passwordRule")}</small>
                )}
              </label>
            )}
            {mode === "login" && (
              <Link className="forgot-link" to="/forgot-password">
                {t("forgot")} <ArrowUpRight size={13} />
              </Link>
            )}
            {error && (
              <p role="alert" className="field-error">
                {t(error)}
              </p>
            )}
            {message && (
              <p role="status" className="notice">
                {t(message)}
              </p>
            )}
            <button
              className="btn primary full"
              disabled={isSubmitting || !configured}
            >
              {isSubmitting
                ? t("loading")
                : t(
                    mode === "forgot"
                      ? "sendReset"
                      : mode === "reset"
                        ? "changePassword"
                        : mode,
                  )}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {t(mode === "login" ? "noAccount" : "haveAccount")}{" "}
            <Link to={mode === "login" ? "/register" : "/login"}>
              {t(mode === "login" ? "register" : "login")}
            </Link>
          </p>
          <div className="auth-divider" />
          <p className="auth-note">
            <Sparkles size={15} />
            {t("noAI")}
          </p>
        </div>
        <div className="auth-bottom">
          AI StudyLab · 2026 <span>{t("university")}</span>
        </div>
      </section>
    </div>
  );
}
function Graduation() {
  return (
    <>
      <BookOpen size={67} strokeWidth={1} />
      <span className="art-spark">✦</span>
    </>
  );
}
