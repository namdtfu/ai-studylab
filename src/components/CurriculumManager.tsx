import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "./ui";
import { curriculumSchema, type Curriculum } from "../lib/curriculum";

export function CurriculumManager({
  catalog,
  onSave,
  onClose,
}: {
  catalog: Curriculum;
  onSave: (catalog: Curriculum) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Curriculum>(() =>
    structuredClone(catalog),
  );
  const [semesterId, setSemesterId] = useState(catalog.semesters[0].id);
  const [newSubject, setNewSubject] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const semester = draft.semesters.find((s) => s.id === semesterId)!;
  function subjects(next: string[]) {
    setError("");
    setDraft((d) => ({
      ...d,
      semesters: d.semesters.map((s) =>
        s.id === semesterId ? { ...s, subjects: next } : s,
      ),
    }));
  }
  function addSubject() {
    const name = newSubject.trim();
    if (!name || name.length > 120) {
      setError("subjectNameRequired");
      return;
    }
    if (
      semester.subjects.some(
        (s) => s.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      setError("duplicateSubject");
      return;
    }
    subjects([...semester.subjects, name]);
    setNewSubject("");
  }
  function addSemester() {
    const number = Math.max(...draft.semesters.map((s) => s.number)) + 1;
    if (number > 12) return;
    const id = crypto.randomUUID();
    setDraft((d) => ({
      ...d,
      semesters: [...d.semesters, { id, number, subjects: [] }],
    }));
    setSemesterId(id);
    setNewSubject("");
    setError("");
  }
  async function save() {
    const parsed = curriculumSchema.safeParse(draft);
    if (!parsed.success) {
      setError(
        parsed.error.issues.some((i) => i.message === "duplicateSubject")
          ? "duplicateSubject"
          : "subjectNameRequired",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(parsed.data);
      onClose();
    } catch {
      setError("catalogSaveError");
    } finally {
      setBusy(false);
    }
  }
  return createPortal(
    <Modal
      title={t("manageCurriculum")}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="muted small">{t("manageCurriculumHelp")}</p>
      <label>
        {t("semester")}
        <select
          value={semesterId}
          disabled={busy}
          onChange={(e) => {
            setSemesterId(e.target.value);
            setNewSubject("");
            setError("");
          }}
        >
          {draft.semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {t("semesterNumber", { number: s.number })}
            </option>
          ))}
        </select>
      </label>
      <div className="curriculum-editor-list">
        {semester.subjects.map((name, i) => (
          <div className="curriculum-editor-row" key={`${semesterId}-${i}`}>
            <label className="sr-only" htmlFor={`subject-${i}`}>
              {t("editSubject", { number: i + 1 })}
            </label>
            <input
              id={`subject-${i}`}
              maxLength={120}
              value={name}
              disabled={busy}
              onChange={(e) =>
                subjects(
                  semester.subjects.map((s, k) =>
                    k === i ? e.target.value : s,
                  ),
                )
              }
            />
            <button
              className="icon-btn"
              type="button"
              disabled={busy}
              aria-label={t("removeSubject", { name })}
              onClick={() =>
                subjects(semester.subjects.filter((_, k) => k !== i))
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      {!semester.subjects.length && (
        <p className="empty-inline small">{t("noSemesterSubjects")}</p>
      )}
      <div className="curriculum-add-row">
        <label>
          <span className="sr-only">{t("newSubject")}</span>
          <input
            aria-label={t("newSubject")}
            value={newSubject}
            maxLength={120}
            disabled={busy || semester.subjects.length >= 50}
            placeholder={t("newSubject")}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSubject();
              }
            }}
          />
        </label>
        <button
          className="btn secondary"
          type="button"
          disabled={busy || semester.subjects.length >= 50}
          onClick={addSubject}
        >
          <Plus size={16} />
          {t("addSubject")}
        </button>
      </div>
      <button
        className="curriculum-add-semester"
        type="button"
        disabled={
          busy ||
          draft.semesters.length >= 12 ||
          Math.max(...draft.semesters.map((s) => s.number)) >= 12
        }
        onClick={addSemester}
      >
        <Plus size={15} />
        {t("addSemester")}
      </button>
      {error && (
        <p role="alert" className="field-error">
          {t(error)}
        </p>
      )}
      <div className="actions">
        <button
          type="button"
          className="btn secondary"
          disabled={busy}
          onClick={onClose}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {t(busy ? "loading" : "save")}
        </button>
      </div>
    </Modal>,
    document.body,
  );
}
