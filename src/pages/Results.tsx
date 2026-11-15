import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  History,
} from "lucide-react";
import { api, type AnswerResult } from "../lib/api";
import { State, useLoad, PageTitle } from "../components/ui";
import { Markdown } from "../components/Markdown";
export function AnswerReview({
  answer: a,
  index,
}: {
  answer: AnswerResult;
  index: number;
}) {
  const { t } = useTranslation();
  return (
    <article
      className={`panel answer-review ${a.correct ? "correct" : "incorrect"}`}
    >
      <div className="section-heading">
        <span className="question-count">
          {t("question")} {index + 1}
        </span>
        <span className={`badge ${a.correct ? "complete" : "wrong"}`}>
          {a.correct ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{" "}
          {t(a.correct ? "correct" : "incorrect")}
        </span>
      </div>
      <Markdown>{a.questionText}</Markdown>
      <div className="result-options">
        {Object.entries(a.options).map(([k, v]) => (
          <div
            className={
              k === a.correctOption
                ? "correct-option"
                : k === a.selected
                  ? "incorrect-option"
                  : ""
            }
            key={k}
          >
            <strong>{k}</strong>
            <Markdown>{v}</Markdown>
            {k === a.correctOption && <CheckCircle2 size={18} />}
          </div>
        ))}
      </div>
      <p className="small">
        {t("yourAnswer")}: <strong>{a.selected || t("unanswered")}</strong> ·{" "}
        {t("correctAnswer")}: <strong>{a.correctOption}</strong>
      </p>
      <div className="explanation">
        <h4>{t("explanation")}</h4>
        <Markdown>{a.explanation}</Markdown>
        {a.sourcePage && (
          <p className="small muted">
            {t("sourcePage", { page: a.sourcePage })}
          </p>
        )}
      </div>
    </article>
  );
}
export function Results() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const q = useLoad(() => api.attempt(id), [id]);
  const a = q.data;
  return (
    <>
      <PageTitle eyebrow={t("progressMotto")} title={t("result")} />
      <State loading={q.loading} error={q.error} retry={q.reload}>
        {a && (
          <>
            <section className="panel result-hero">
              <div
                className="score-circle"
                style={{
                  background: `conic-gradient(var(--green) ${a.score}%, var(--line) 0)`,
                }}
                role="img"
                aria-label={`${t("score")}: ${a.score}/100`}
              >
                <div>
                  <strong>{a.score}</strong>
                  <span>/ 100</span>
                </div>
              </div>
              <div>
                <span className="eyebrow">
                  {t("attemptNumber", { count: a.attempt_number })} · v
                  {a.lesson_version_id.slice(0, 8)}
                </span>
                <h2>{a.result.title}</h2>
                <p className="muted">
                  {a.result.subject} / {a.result.chapter}
                </p>
                <div className="result-counts">
                  <span>
                    <CheckCircle2 size={17} />
                    {t("correct")} {a.correct_count}
                  </span>
                  <span>
                    <XCircle size={17} />
                    {t("incorrect")} {10 - a.correct_count}
                  </span>
                </div>
                <p className="small muted">
                  {new Date(a.submitted_at).toLocaleString(i18n.language)}
                </p>
              </div>
            </section>
            <div className="actions result-actions">
              <Link className="btn primary" to={`/quiz/${a.lesson_id}`}>
                <RotateCcw size={16} />
                {t("retake")}
              </Link>
              <Link className="btn secondary" to={`/lessons/${a.lesson_id}`}>
                <BookOpen size={16} />
                {t("reviewTheory")}
              </Link>
              <Link className="btn secondary" to="/history">
                <History size={16} />
                {t("history")}
              </Link>
            </div>
            {a.result.answers.map((answer, i) => (
              <AnswerReview key={answer.questionId} answer={answer} index={i} />
            ))}
          </>
        )}
      </State>
    </>
  );
}
