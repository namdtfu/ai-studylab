import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileJson, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { api } from "../lib/api";
import { parseLessonInput, repairLessonInput } from "../lib/lesson-input";
import {
  parseLesson,
  validationIssues,
  type LessonContent,
  MAX_JSON_BYTES,
} from "../schemas/lesson";
import { PageTitle, download } from "../components/ui";
import { LessonBody } from "../components/LessonContent";
import { Markdown } from "../components/Markdown";
import schema from "../../examples/lesson.schema.json";
export function Import() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const [raw, setRaw] = useState(""),
    [content, setContent] = useState<LessonContent>(),
    [issues, setIssues] = useState<{ path: string; key: string }[]>([]),
    [error, setError] = useState(""),
    [repaired, setRepaired] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!editId) return;
    setBusy(true);
    api
      .edit(editId)
      .then((c) => {
        setRaw(JSON.stringify(c, null, 2));
        setContent(c);
      })
      .catch(() => setError("error"))
      .finally(() => setBusy(false));
  }, [editId]);
  function update(value: string) {
    setRaw(value);
    setContent(undefined);
    setIssues([]);
    setError("");
    setRepaired(false);
  }
  function validate() {
    setError("");
    try {
      setContent(parseLessonInput(raw));
      setIssues([]);
    } catch (e) {
      setContent(undefined);
      setIssues(validationIssues(e));
    }
  }
  function repair() {
    setError("");
    setRepaired(false);
    try {
      const result = repairLessonInput(raw);
      setRaw(result.raw);
      setContent(result.content);
      setIssues([]);
      setRepaired(true);
    } catch (e) {
      setContent(undefined);
      setIssues(validationIssues(e));
      setError("jsonRepairFailed");
    }
  }
  async function file(file?: File) {
    if (!file) return;
    if (file.size > MAX_JSON_BYTES) {
      setError("tooLarge");
      return;
    }
    update(await file.text());
  }
  async function sample(name: string) {
    setError("");
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}examples/${name}.json`);
      if (!r.ok) throw Error();
      const text = await r.text();
      update(text);
      setContent(parseLesson(text));
    } catch {
      setError("error");
    }
  }
  async function save() {
    if (!content) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.import(content, editId || undefined);
      navigate(`/lessons/${r.lessonId}`, {
        state: { message: r.duplicate ? "duplicate" : "saved" },
      });
    } catch {
      setError("error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow={t("fromAI")}
        title={t(editId ? "edit" : "import")}
        description={t("structureNotice")}
        action={
          <button
            className="btn secondary"
            onClick={() => download("lesson.schema.json", schema)}
          >
            <Download size={16} />
            {t("downloadSchema")}
          </button>
        }
      />
      <div className="notice warning">
        <AlertTriangle size={23} />
        <p>{t("importNotice")}</p>
      </div>
      <div className="import-layout">
        <section className="panel form-panel">
          <div className="section-heading">
            <h2>
              <FileJson size={20} />
              {t("pasteJson")}
            </h2>
            <label className="btn secondary file-button">
              {t("jsonFile")}
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => void file(e.target.files?.[0])}
              />
            </label>
          </div>
          <textarea
            className="code json-editor"
            aria-label={t("pasteJson")}
            placeholder={'{\n  "schemaVersion": "1.0",\n  ...\n}'}
            value={raw}
            onChange={(e) => update(e.target.value)}
            maxLength={MAX_JSON_BYTES}
          />
          <div className="actions">
            <button
              className="btn primary"
              onClick={validate}
              disabled={!raw || busy}
            >
              <CheckCircle2 size={17} />
              {t("validate")}
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={repair}
              disabled={!raw || busy}
            >
              {t("repairJson")}
            </button>
          </div>
          <p className="muted small">{t("jsonPasteHelp")}</p>
          {repaired && (
            <p className="notice" role="status">
              {t("jsonRepaired")}
            </p>
          )}
          {issues.length > 0 && (
            <ul className="validation-errors" role="alert">
              {issues.map((e, i) => (
                <li key={i}>
                  <code>{e.path}</code> — {t(e.key)}
                </li>
              ))}
            </ul>
          )}
          {issues.some((e) => e.key === "invalidJson") && (
            <p className="small field-error">{t("jsonEscapeHelp")}</p>
          )}
          {error && (
            <p className="field-error" role="alert">
              {t(error)}
            </p>
          )}
        </section>
        <aside className="panel sample-panel">
          <span className="eyebrow">{t("sampleStart")}</span>
          <h2>{t("samples")}</h2>
          <p className="muted small">{t("sampleHelp")}</p>
          {[
            ["coulomb", "대학물리학2", "쿨롱의 법칙"],
            ["partial-derivatives", "미적분학", "편도함수"],
          ].map(([name, subject, title]) => (
            <div className="sample-card" key={name}>
              <span className="small muted">{subject}</span>
              <h3>{title}</h3>
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() => void sample(name)}
              >
                {t("loadSample")}
              </button>
            </div>
          ))}
        </aside>
      </div>
      {content && (
        <section className="panel lesson-preview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("previewAnswers")}</p>
              <h2>{content.title}</h2>
              <span className="muted">
                {content.subject} / {content.chapter} · {content.language}
              </span>
            </div>
            <button
              className="btn primary"
              onClick={() => void save()}
              disabled={busy}
            >
              {busy ? t("loading") : t("saveLesson")}
            </button>
          </div>
          <LessonBody content={content} />
          <h2>{t("quiz")} · 10</h2>
          {content.questions.map((q, i) => (
            <details className="question-preview" key={q.id}>
              <summary>
                {i + 1}. {q.questionText}
              </summary>
              <ol type="A">
                {Object.entries(q.options).map(([k, v]) => (
                  <li key={k}>
                    <Markdown>{v}</Markdown>
                  </li>
                ))}
              </ol>
              <p className="badge complete">
                {t("correctAnswer")}: {q.correctOption}
              </p>
              <Markdown>{q.explanation}</Markdown>
            </details>
          ))}
          <div className="actions">
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => void save()}
            >
              {t("saveLesson")}
            </button>
            <button
              className="btn secondary"
              onClick={() => download(`${content.title}.json`, content)}
            >
              {t("download")}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
