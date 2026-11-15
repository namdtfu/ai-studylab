import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, FileInput, Sparkles, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { PageTitle, State, useLoad } from "../components/ui";
import { LessonCards } from "./Dashboard";
export function Lessons() {
  const { t } = useTranslation();
  const [search, setSearch] = useState(""),
    [subject, setSubject] = useState("");
  const q = useLoad(() => Promise.all([api.lessons(), api.progress()]));
  const [lessons, progress] = q.data || [[], []];
  const filtered = lessons.filter(
    (l) =>
      (!subject || l.subject === subject) &&
      `${l.title} ${l.subject} ${l.chapter}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title={t("lessons")}
        description={t("createHelp")}
        action={
          <Link className="btn primary" to="/create">
            <Plus size={18} />
            {t("newLesson")}
          </Link>
        }
      />
      <div className="filter-row">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label={t("search")}
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label={t("subject")}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="">{t("allSubjects")}</option>
          {[...new Set(lessons.map((l) => l.subject))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <State loading={q.loading} error={q.error} retry={q.reload}>
        {filtered.length ? (
          <LessonCards
            lessons={filtered}
            completed={progress
              .filter((p) => p.completed_at)
              .map((p) => p.lesson_id)}
          />
        ) : (
          <div className="empty-state">
            <h3>{t("emptyLessons")}</h3>
            <p>{t("emptyBody")}</p>
            <Link to="/import" className="btn primary">
              {t("import")}
            </Link>
          </div>
        )}
      </State>
    </>
  );
}
export function CreateLesson() {
  const { t } = useTranslation();
  return (
    <>
      <PageTitle
        eyebrow={t("buildKnowledge")}
        title={t("newLesson")}
        description={t("createHelp")}
      />
      <div className="create-options">
        {[
          ["/prompt", Sparkles, "prompt", "promptHelp"],
          ["/import", FileInput, "import", "sampleHelp"],
        ].map(([path, Icon, title, desc]) => {
          const I = Icon as typeof Sparkles;
          return (
            <Link
              className="create-option panel"
              key={String(path)}
              to={String(path)}
            >
              <div className="option-icon">
                <I size={30} />
              </div>
              <h2>{t(String(title))}</h2>
              <p className="muted">{t(String(desc))}</p>
              <ArrowRight />
            </Link>
          );
        })}
      </div>
    </>
  );
}
