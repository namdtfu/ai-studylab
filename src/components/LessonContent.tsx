import { useTranslation } from "react-i18next";
import { CheckCircle2, BookOpen, Lightbulb, AlertTriangle } from "lucide-react";
import type { PublicContent } from "../schemas/lesson";
import { Markdown } from "./Markdown";
export function LessonBody({ content: c }: { content: PublicContent }) {
  const { t } = useTranslation();
  return (
    <div className="theory-content">
      <section className="objectives">
        <h2>
          <CheckCircle2 size={20} />
          {t("objectives")}
        </h2>
        <ul>
          {c.learningObjectives.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </section>
      {c.theorySections.map((s, i) => (
        <section className="theory-section" key={i}>
          <span className="section-number">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <h2>{s.heading}</h2>
            <Markdown>{s.content}</Markdown>
            {s.example && (
              <div className="example-box">
                <Markdown>{s.example}</Markdown>
              </div>
            )}
          </div>
        </section>
      ))}
      <section>
        <h2>
          <BookOpen size={20} />
          {t("examples")}
        </h2>
        {c.workedExamples.map((e, i) => (
          <div className="example-box" key={i}>
            <h3>{e.title}</h3>
            <Markdown>{e.problem}</Markdown>
            <Markdown>{e.solution}</Markdown>
          </div>
        ))}
      </section>
      <section className="mistake-box">
        <h2>
          <AlertTriangle size={20} />
          {t("mistakes")}
        </h2>
        {c.commonMistakes.map((m, i) => (
          <Markdown key={i}>{m}</Markdown>
        ))}
      </section>
      <section className="summary-box">
        <h2>
          <Lightbulb size={20} />
          {t("summary")}
        </h2>
        <Markdown>{c.summary}</Markdown>
      </section>
    </div>
  );
}
