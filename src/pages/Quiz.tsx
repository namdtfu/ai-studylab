import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, Send, ShieldCheck } from "lucide-react";
import { api, type Version } from "../lib/api";
import { useAuth } from "../app/Auth";
import { State, useLoad, Modal } from "../components/ui";
import { Markdown } from "../components/Markdown";
import { draftKey, loadDraft, saveDraft } from "../lib/draft";
import type { Option } from "../schemas/lesson";
export function Quiz() {
  const { id = "" } = useParams();
  const q = useLoad(() => api.version(id), [id]);
  return (
    <State loading={q.loading} error={q.error} retry={q.reload}>
      {q.data && <QuizRunner key={q.data.id} version={q.data} />}
    </State>
  );
}
export function QuizRunner({ version }: { version: Version }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const key = draftKey(user!.id, version.id);
  const [draft, setDraft] = useState(() =>
    loadDraft(
      key,
      version.content.questions.map((q) => q.id),
    ),
  );
  const [index, setIndex] = useState(0),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [storageError, setStorageError] = useState(false);
  const questions = version.content.questions;
  const q = questions[index];
  const unanswered = questions.filter((q) => !draft.answers[q.id]).length;
  useEffect(() => {
    try {
      saveDraft(key, draft);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [draft, key]);
  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const result = await api.grade(
        version.lesson_id,
        version.id,
        draft.answers,
        draft.submissionId,
      );
      localStorage.removeItem(key);
      navigate(`/results/${result.attemptId}`, { replace: true });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to={`/lessons/${version.lesson_id}`}>
        ← {t("reviewTheory")}
      </Link>
      <div className="quiz-heading">
        <div>
          <p className="eyebrow">
            {version.content.subject} / {version.content.chapter}
          </p>
          <h1>{version.content.title}</h1>
          <p className="muted">{t("unlimited")}</p>
        </div>
        <span className="badge">
          {t("answered")} {10 - unanswered}/10
        </span>
      </div>
      <div className="quiz-layout">
        <section className="panel question-card">
          <div className="question-meta">
            <span className="question-count">
              {t("question")} {String(index + 1).padStart(2, "0")}{" "}
              <span>/ 10</span>
            </span>
            <span className="badge">
              {t(
                q.category === "theory"
                  ? "theoryCategory"
                  : "applicationCategory",
              )}
            </span>
          </div>
          <div className="question-text">
            <Markdown>{q.questionText}</Markdown>
          </div>
          <fieldset className="answer-options">
            <legend className="sr-only">{t("yourAnswer")}</legend>
            {(Object.entries(q.options) as [Option, string][]).map(
              ([option, text]) => (
                <label
                  className={
                    draft.answers[q.id] === option
                      ? "answer-option selected"
                      : "answer-option"
                  }
                  key={option}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={option}
                    checked={draft.answers[q.id] === option}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        answers: { ...d.answers, [q.id]: option },
                      }))
                    }
                  />
                  <span className="option-letter">{option}</span>
                  <Markdown>{text}</Markdown>
                  {draft.answers[q.id] === option && (
                    <Check className="option-check" size={18} />
                  )}
                </label>
              ),
            )}
          </fieldset>
          <div className="question-footer">
            <button
              className="btn secondary"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              <ArrowLeft size={16} />
              {t("previous")}
            </button>
            <button
              className="btn primary"
              onClick={() =>
                index < 9 ? setIndex((i) => i + 1) : setConfirm(true)
              }
            >
              {t(index < 9 ? "next" : "submit")}
              {index < 9 ? <ArrowRight size={16} /> : <Send size={16} />}
            </button>
          </div>
        </section>
        <aside className="panel quiz-navigation">
          <h3>{t("quiz")}</h3>
          <p className="small muted">
            {t("answered")} {10 - unanswered} · {t("unanswered")} {unanswered}
          </p>
          <div className="question-grid">
            {questions.map((item, i) => (
              <button
                key={item.id}
                className={`${i === index ? "current " : ""}${draft.answers[item.id] ? "filled" : ""}`}
                aria-current={i === index ? "step" : undefined}
                aria-label={`${t("question")} ${i + 1} · ${t(draft.answers[item.id] ? "answered" : "unanswered")}`}
                onClick={() => setIndex(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <progress max={10} value={10 - unanswered} />
          <p className="small muted">
            <ShieldCheck size={15} />
            {t("draftSaved")}
          </p>
          {storageError && (
            <p role="alert" className="field-error">
              {t("error")}
            </p>
          )}
          <button className="btn primary full" onClick={() => setConfirm(true)}>
            <Send size={16} />
            {t("submit")}
          </button>
        </aside>
      </div>
      {confirm && (
        <Modal
          title={t("submit")}
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <p>{t("confirmSubmit")}</p>
          {unanswered > 0 && (
            <p className="notice warning">
              {t("unansweredWarning", { count: unanswered })}
            </p>
          )}
          {error && (
            <p role="alert" className="field-error">
              {t("error")}
            </p>
          )}
          <div className="actions">
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              {t("cancel")}
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => void submit()}
            >
              {t(busy ? "loading" : "submit")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
