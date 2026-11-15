import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CheckCircle2,
  Trash2,
  Pencil,
  BookOpen,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../app/Auth";
import { State, useLoad, Modal } from "../components/ui";
import { LessonBody } from "../components/LessonContent";
export function Lesson() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const q = useLoad(() => api.version(id), [id]);
  const [done, setDone] = useState(false),
    [remove, setRemove] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const c = q.data?.content;
  useEffect(() => {
    if (!c || !user) return;
    let active = true;
    api
      .progress()
      .then((p) => {
        if (active)
          setDone(p.some((x) => x.lesson_id === id && !!x.completed_at));
      })
      .catch(() => {});
    api.touch(id, user.id).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, [id, !!c, user?.id]);
  async function complete() {
    setBusy(true);
    try {
      await api.complete(id, user!.id);
      setDone(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  async function discard() {
    setBusy(true);
    try {
      await api.remove(id);
      navigate("/lessons");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <State loading={q.loading} error={q.error} retry={q.reload}>
      {c && (
        <>
          <Link to="/lessons" className="back-link">
            ← {t("lessons")}
          </Link>
          {location.state?.message && (
            <p role="status" className="notice">
              {t(location.state.message)}
            </p>
          )}
          <div className="lesson-heading">
            <div>
              <p className="eyebrow">
                {c.subject} <span>/</span> {c.chapter}
              </p>
              <h1>{c.title}</h1>
              <p className="muted">
                {c.academicLevel} · {c.language} · v{q.data?.version}
              </p>
            </div>
            <div className="actions">
              <Link className="btn secondary" to={`/import?edit=${id}`}>
                <Pencil size={15} />
                {t("edit")}
              </Link>
              <button
                className="icon-btn"
                aria-label={t("delete")}
                onClick={() => setRemove(true)}
              >
                <Trash2 size={19} />
              </button>
            </div>
          </div>
          <div className="lesson-tabs">
            <span className="active">
              <BookOpen size={18} />
              {t("theory")}
            </span>
            <Link to={`/quiz/${id}`}>
              {t("quiz")} <span className="badge">10</span>
            </Link>
          </div>
          <div className="reader-layout">
            <article className="panel reader">
              <LessonBody content={c} />
              <div className="reader-actions">
                <button
                  className="btn secondary"
                  disabled={busy || done}
                  onClick={() => void complete()}
                >
                  <CheckCircle2 size={17} />
                  {t(done ? "completed" : "markComplete")}
                </button>
                <Link className="btn primary" to={`/quiz/${id}`}>
                  {t("startQuiz")}
                  <ArrowRight size={17} />
                </Link>
              </div>
            </article>
            <aside className="panel reader-aside">
              <p className="eyebrow">{t("learningPath")}</p>
              <h3>{t("theory")}</h3>
              {c.theorySections.map((s, i) => (
                <p key={i} className="small muted">
                  {String(i + 1).padStart(2, "0")} · {s.heading}
                </p>
              ))}
              <hr />
              <p className="small muted">{t("unlimited")}</p>
              <Link className="btn primary full" to={`/quiz/${id}`}>
                {t("startQuiz")}
                <ArrowRight size={15} />
              </Link>
            </aside>
          </div>
          {error && (
            <p role="alert" className="field-error">
              {t("error")}
            </p>
          )}
          {remove && (
            <Modal title={t("delete")} onClose={() => setRemove(false)}>
              <p>{t("deleteConfirm")}</p>
              <div className="actions">
                <button
                  className="btn secondary"
                  onClick={() => setRemove(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  className="btn danger"
                  disabled={busy}
                  onClick={() => void discard()}
                >
                  {t("delete")}
                </button>
              </div>
            </Modal>
          )}
        </>
      )}
    </State>
  );
}
