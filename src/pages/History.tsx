import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { PageTitle, State, useLoad } from "../components/ui";
import { AttemptList } from "./Dashboard";
import { AnswerReview } from "./Results";
export function History({ notebook = false }: { notebook?: boolean }) {
  const { t, i18n } = useTranslation();
  const q = useLoad(() => api.attempts());
  const [subject, setSubject] = useState(""),
    [lesson, setLesson] = useState("");
  const list = q.data || [];
  const filtered = list.filter(
    (a) =>
      (!subject || a.result.subject === subject) &&
      (!lesson || a.lesson_id === lesson),
  );
  return (
    <>
      <PageTitle
        title={t(notebook ? "notebook" : "history")}
        description={t("unlimited")}
      />
      <div className="filter-row">
        <select
          aria-label={t("subject")}
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setLesson("");
          }}
        >
          <option value="">{t("allSubjects")}</option>
          {[...new Set(list.map((a) => a.result.subject))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label={t("lessons")}
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
        >
          <option value="">{t("all")}</option>
          {[
            ...new Map(
              list
                .filter((a) => !subject || a.result.subject === subject)
                .map((a) => [a.lesson_id, a.result.title]),
            ).entries(),
          ].map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      </div>
      <State loading={q.loading} error={q.error} retry={q.reload}>
        {notebook ? (
          <>
            {filtered.flatMap((a) =>
              a.result.answers
                .filter((x) => !x.correct)
                .map((answer) => (
                  <section
                    key={`${a.id}-${answer.questionId}`}
                    className="notebook-entry"
                  >
                    <div className="section-heading">
                      <div>
                        <strong>{a.result.title}</strong>
                        <p className="small muted">
                          {a.result.subject} / {a.result.chapter} ·{" "}
                          {t("attemptNumber", { count: a.attempt_number })} ·{" "}
                          {new Date(a.submitted_at).toLocaleDateString(
                            i18n.language,
                          )}
                        </p>
                      </div>
                      <Link
                        className="btn secondary"
                        to={`/quiz/${a.lesson_id}`}
                      >
                        {t("practiceWrong")}
                      </Link>
                    </div>
                    <AnswerReview answer={answer} index={a.result.answers.findIndex((q)=>q.questionId===answer.questionId)} />
                  </section>
                )),
            )}
            {!filtered.some((a) =>
              a.result.answers.some((x) => !x.correct),
            ) && (
              <div className="empty-state">
                <h3>{t("emptyMistakes")}</h3>
              </div>
            )}
          </>
        ) : (
          <section className="panel">
            <AttemptList attempts={filtered} />
          </section>
        )}
      </State>
    </>
  );
}
