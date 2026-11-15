import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Plus,
  BookOpen,
  CheckCircle2,
  BarChart3,
  Target,
  Sparkles,
} from "lucide-react";
import { api, type Lesson, type Attempt } from "../lib/api";
import { useAuth } from "../app/Auth";
import { PageTitle, State, useLoad } from "../components/ui";
export function LessonCards({
  lessons,
  completed = [],
}: {
  lessons: Lesson[];
  completed?: string[];
}) {
  const { t } = useTranslation();
  return (
    <div className="lesson-grid">
      {lessons.map((l, i) => (
        <Link className="lesson-card" to={`/lessons/${l.id}`} key={l.id}>
          <div className={`lesson-visual tone-${i % 3}`}>
            <BookOpen size={35} strokeWidth={1.2} />
            <span>{l.subject}</span>
            <span className="visual-index">
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
          <div className="lesson-card-body">
            <span className="small muted">{l.chapter}</span>
            <h3>{l.title}</h3>
            <div className="card-bottom">
              <span
                className={
                  completed.includes(l.id) ? "badge complete" : "badge"
                }
              >
                {t(completed.includes(l.id) ? "completed" : "notStarted")}
              </span>
              <ArrowRight size={17} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
export function AttemptList({ attempts }: { attempts: Attempt[] }) {
  const { t, i18n } = useTranslation();
  return attempts.length ? (
    <div className="attempt-list">
      {attempts.map((a) => (
        <Link key={a.id} to={`/results/${a.id}`}>
          <span className="attempt-icon">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <strong>{a.result.title}</strong>
            <small>
              {a.result.subject} ·{" "}
              {t("attemptNumber", { count: a.attempt_number })} ·{" "}
              {new Date(a.submitted_at).toLocaleDateString(i18n.language)}
            </small>
          </div>
          <span className="attempt-score">
            {a.score}
            <small>/100</small>
          </span>
          <ArrowRight size={17} />
        </Link>
      ))}
    </div>
  ) : (
    <p className="empty-inline">{t("emptyAttempts")}</p>
  );
}
export function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const q = useLoad(() =>
    Promise.all([api.lessons(), api.attempts(), api.progress()]),
  );
  const [lessons, attempts, progress] = q.data || [[], [], []];
  const activeIds = new Set(lessons.map((l) => l.id));
  const done = progress.filter(
    (p) => activeIds.has(p.lesson_id) && !!p.completed_at,
  );
  const recent = [...lessons].sort((a, b) => {
    const when = (id: string, fallback: string) =>
      progress.find((p) => p.lesson_id === id)?.last_studied_at || fallback;
    return when(b.id, b.updated_at).localeCompare(when(a.id, a.updated_at));
  });
  const average = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
    : 0;
  return (
    <>
      <PageTitle
        eyebrow={t("journey")}
        title={`${t("welcome")}, ${user?.user_metadata?.display_name || user?.email?.split("@")[0] || ""}`}
        description={t("welcomeSub")}
        action={
          <Link className="btn primary" to="/create">
            <Plus size={17} />
            {t("newLesson")}
          </Link>
        }
      />
      <State loading={q.loading} error={q.error} retry={q.reload}>
        <div className="welcome-banner">
          <div>
            <span className="pill light">{t("pace")}</span>
            <h2>{t("newStart")}</h2>
            <p>{t("createHelp")}</p>
            <Link
              to={lessons.length ? `/lessons/${recent[0].id}` : "/prompt"}
              className="btn cream"
            >
              {t(lessons.length ? "continue" : "prompt")}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="banner-art" aria-hidden="true">
            <BookOpen size={110} strokeWidth={0.8} />
            <span>✳</span>
            <i>f(x)</i>
          </div>
        </div>
        <div className="stats-grid">
          {[
            [BookOpen, "totalLessons", lessons.length],
            [CheckCircle2, "completed", done.length],
            [BarChart3, "attempts", attempts.length],
            [Target, "average", `${average} / 100`],
          ].map(([Icon, key, value]) => {
            const I = Icon as typeof BookOpen;
            return (
              <div className="stat" key={String(key)}>
                <div className="stat-label">
                  <span>{t(String(key))}</span>
                  <I size={18} />
                </div>
                <strong>{String(value)}</strong>
              </div>
            );
          })}
        </div>
        <div className="section-heading">
          <h2>{t("recentLessons")}</h2>
          <Link to="/lessons">
            {t("all")}
            <ArrowRight size={15} />
          </Link>
        </div>
        {lessons.length ? (
          <LessonCards
            lessons={recent.slice(0, 3)}
            completed={done.map((p) => p.lesson_id)}
          />
        ) : (
          <div className="empty-state">
            <Sparkles size={32} />
            <h3>{t("emptyLessons")}</h3>
            <p>{t("emptyBody")}</p>
            <Link className="btn primary" to="/import">
              {t("import")}
            </Link>
          </div>
        )}
        <div className="dashboard-lower">
          <section className="panel">
            <div className="section-heading">
              <h2>{t("recentAttempts")}</h2>
              <Link to="/history">
                <ArrowRight size={18} />
              </Link>
            </div>
            <AttemptList attempts={attempts.slice(0, 4)} />
          </section>
          <section className="panel">
            <h2>{t("subjectProgress")}</h2>
            {[...new Set(lessons.map((l) => l.subject))].map((subject) => {
              const list = lessons.filter((l) => l.subject === subject),
                count = list.filter((l) =>
                  done.some((p) => p.lesson_id === l.id),
                ).length;
              return (
                <div className="subject-progress" key={subject}>
                  <div>
                    <strong>{subject}</strong>
                    <span>
                      {count}/{list.length}
                    </span>
                  </div>
                  <progress max={list.length} value={count} />
                </div>
              );
            })}
            {!lessons.length && (
              <p className="empty-inline">{t("emptyBody")}</p>
            )}
          </section>
        </div>
      </State>
    </>
  );
}
