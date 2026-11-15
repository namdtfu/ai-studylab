import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, User, ShieldCheck } from "lucide-react";
import { useAuth } from "../app/Auth";
import { api } from "../lib/api";
import { client, authRedirect } from "../lib/supabase";
import { Preferences } from "../components/Layout";
import { PageTitle } from "../components/ui";
export function Settings() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.display_name || ""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  async function action(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(false);
    try {
      await fn();
      setMessage(message);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title={t("settings")} description={t("private")} />
      <div className="settings-grid">
        <section className="panel form-panel">
          <h2>
            <User size={21} />
            {t("profile")}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                await api.preferences(user!.id, { display_name: name });
                const r = await client().auth.updateUser({
                  data: { display_name: name },
                });
                if (r.error) throw r.error;
              }, "saved");
            }}
          >
            <label>
              {t("email")}
              <input value={user?.email || ""} readOnly />
            </label>
            <label>
              {t("name")}
              <input
                value={name}
                required
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="btn primary" disabled={busy}>
              {t("save")}
            </button>
          </form>
        </section>
        <section className="panel form-panel">
          <h2>
            {t("language")} & {t("theme")}
          </h2>
          <Preferences />
          <hr />
          <h3>
            <ShieldCheck size={18} />
            {t("reset")}
          </h3>
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() =>
              void action(async () => {
                const r = await client().auth.resetPasswordForEmail(
                  user!.email!,
                  { redirectTo: authRedirect() },
                );
                if (r.error) throw r.error;
              }, "resetSent")
            }
          >
            {t("sendReset")}
          </button>
          <hr />
          <button className="btn secondary" onClick={() => void logout()}>
            <LogOut size={17} />
            {t("logout")}
          </button>
        </section>
      </div>
      {message && (
        <p className="notice" role="status">
          {t(message)}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {t("error")}
        </p>
      )}
    </>
  );
}
