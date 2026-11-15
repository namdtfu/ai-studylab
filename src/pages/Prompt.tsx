import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { buildPrompt, type PromptSettings } from "../lib/prompt";
import { CopyButton, PageTitle, useLoad } from "../components/ui";
import { CoursePicker } from "../components/CoursePicker";
import { api } from "../lib/api";
import { useAuth } from "../app/Auth";
import {
  hasCourse,
  type Curriculum,
  type CourseSelection,
} from "../lib/curriculum";
type PromptFields = Omit<PromptSettings, "subject">;
export function Prompt() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const catalogQuery = useLoad(api.curriculum, [user?.id]);
  const [savedCatalog, setSavedCatalog] = useState<Curriculum | null>(null);
  const catalog = savedCatalog || catalogQuery.data;
  const [selection, setSelection] = useState<CourseSelection | null>(null);
  const [subjectError, setSubjectError] = useState(false);
  async function saveCatalog(next: Curriculum) {
    if (!user) throw new Error("sessionExpired");
    const result = await api.saveCurriculum(user.id, next);
    setSavedCatalog(result);
    if (!hasCourse(result, selection)) setSelection(null);
    setPrompt("");
  }
  const { register, handleSubmit, setValue, watch } = useForm<PromptFields>({
    defaultValues: {
      chapter: "",
      topic: "",
      language: "한국어",
      reference: "",
      instructions: "",
      pdf: false,
    },
  });
  const [prompt, setPrompt] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const pdf = watch("pdf");
  async function extract(file?: File) {
    if (!file) return;
    setBusy(true);
    setError(false);
    try {
      if (file.size > 20 * 1024 * 1024) throw Error();
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
      const document = await task.promise;
      try {
        if (document.numPages > 100) throw Error();
        let text = "";
        let actualTextLength = 0;
        for (let i = 1; i <= document.numPages; i++) {
          const page = await document.getPage(i);
          const c = await page.getTextContent();
          const pageText = c.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          actualTextLength += pageText.trim().length;
          text += `\n[Page ${i}]\n` + pageText;
          if (text.length > 300000) throw Error();
        }
        if (actualTextLength < 40) throw Error();
        setValue("reference", text);
      } finally {
        await task.destroy();
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow={t("curiosity")}
        title={t("prompt")}
        description={t("promptHelp")}
      />
      <div className="two-column">
        <form
          className="panel form-panel"
          onSubmit={handleSubmit((s) => {
            if (!catalog || !hasCourse(catalog, selection)) {
              setSubjectError(true);
              return;
            }
            setSubjectError(false);
            setPrompt(buildPrompt({ ...s, subject: selection!.subject }));
          })}
        >
          <h2>
            <Sparkles size={20} />
            {t("newLesson")}
          </h2>
          {catalogQuery.loading && !catalog && (
            <p className="muted small" role="status">
              {t("loading")}
            </p>
          )}
          {catalogQuery.error && !catalog && (
            <div className="notice error" role="alert">
              <p>{t("catalogLoadError")}</p>
              <button
                type="button"
                className="btn secondary"
                onClick={catalogQuery.reload}
              >
                {t("retry")}
              </button>
            </div>
          )}
          {catalog && (
            <CoursePicker
              catalog={catalog}
              value={selection}
              invalid={subjectError}
              onChange={setSelection}
              onSave={saveCatalog}
            />
          )}
          <div className="form-grid">
            {[
              ["chapter", "chapter"],
              ["topic", "title"],
              ["language", "contentLanguage"],
            ].map(([name, key]) => (
              <label key={name}>
                {t(key)}
                <input
                  {...register(name as keyof PromptFields, {
                    required: true,
                    maxLength: 200,
                  })}
                  required
                />
              </label>
            ))}
          </div>
          <label className="checkbox-label">
            <input type="checkbox" {...register("pdf")} />
            {t("pdfMode")}
          </label>
          {pdf && (
            <div className="notice">
              <FileText size={21} />
              <p>{t("pdfHelp")}</p>
            </div>
          )}
          <label>
            {t("reference")}
            <textarea
              rows={5}
              {...register("reference", { maxLength: 300000 })}
            />
          </label>
          {watch("reference") && (
            <div className="actions reference-copy">
              <CopyButton value={watch("reference")} />
            </div>
          )}
          <details>
            <summary>{t("extract")}</summary>
            <p className="muted small">{t("extractHelp")}</p>
            <input
              aria-label={t("extract")}
              type="file"
              accept="application/pdf,.pdf"
              disabled={busy}
              onChange={(e) => void extract(e.target.files?.[0])}
            />
            {busy && <p role="status">{t("loading")}</p>}
            {error && (
              <p className="field-error" role="alert">
                {t("pdfError")}
              </p>
            )}
          </details>
          <label>
            {t("instructions")}
            <textarea
              rows={3}
              {...register("instructions", { maxLength: 10000 })}
            />
          </label>
          <button className="btn primary" disabled={busy || !catalog}>
            <Sparkles size={17} />
            {t("generate")}
          </button>
        </form>
        <section className="panel prompt-output">
          <div className="section-heading">
            <h2>{t("preview")}</h2>
            {prompt && <CopyButton value={prompt} />}
          </div>
          {prompt ? (
            <>
              <textarea
                className="code prompt-code"
                aria-label={t("preview")}
                readOnly
                value={prompt}
              />
              <div className="notice">{t("promptHelp")}</div>
              <Link className="btn primary" to="/import">
                {t("import")}
                <ArrowRight size={17} />
              </Link>
            </>
          ) : (
            <div className="prompt-empty">
              <Sparkles size={38} strokeWidth={1} />
              <h3>{t("promptReady")}</h3>
              <p>{t("promptHelp")}</p>
              <span className="badge">JSON SCHEMA · v1.0</span>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
