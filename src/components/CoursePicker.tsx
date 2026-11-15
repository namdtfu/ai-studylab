import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronDown, Settings2, Check } from "lucide-react";
import { CurriculumManager } from "./CurriculumManager";
import {
  hasCourse,
  type Curriculum,
  type CourseSelection,
} from "../lib/curriculum";

export function CoursePicker({
  catalog,
  value,
  onChange,
  onSave,
  invalid = false,
}: {
  catalog: Curriculum;
  value: CourseSelection | null;
  onChange: (selection: CourseSelection | null) => void;
  onSave: (catalog: Curriculum) => Promise<void>;
  invalid?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false),
    [manager, setManager] = useState(false);
  const [expanded, setExpanded] = useState(
    value?.semesterId || catalog.semesters[0].id,
  );
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId(),
    helpId = useId();
  const selected = hasCourse(catalog, value) ? value : null;
  const selectedSemester = catalog.semesters.find(
    (s) => s.id === selected?.semesterId,
  );
  useEffect(() => {
    if (!open) return;
    function outside(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    if (value && !hasCourse(catalog, value)) onChange(null);
  }, [catalog, value, onChange]);
  return (
    <div className="course-picker-field">
      <span className="course-field-label">{t("subject")}</span>
      <div
        className="course-picker"
        ref={root}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            setOpen(false);
            trigger.current?.focus();
          }
        }}
      >
        <button
          ref={trigger}
          className={`course-picker-trigger ${invalid && !selected ? "invalid" : ""}`}
          type="button"
          aria-label={t("chooseSubject")}
          aria-expanded={open}
          aria-controls={menuId}
          aria-describedby={helpId}
          aria-invalid={invalid && !selected}
          onClick={() => setOpen((s) => !s)}
        >
          <BookOpen size={18} />
          <span>
            {selected ? (
              <>
                <strong>{selected.subject}</strong>
                <small>
                  {t("semesterNumber", { number: selectedSemester?.number })}
                </small>
              </>
            ) : (
              <span className="muted">{t("chooseSubject")}</span>
            )}
          </span>
          <ChevronDown size={17} className={open ? "rotated" : ""} />
        </button>
        {open && (
          <div
            className="course-dropdown"
            id={menuId}
            role="region"
            aria-label={t("subjectsBySemester")}
          >
            <p className="course-dropdown-hint">{t("chooseOneSubject")}</p>
            <div className="semester-groups">
              {catalog.semesters.map((semester) => (
                <section className="semester-group" key={semester.id}>
                  <button
                    className="semester-toggle"
                    type="button"
                    aria-expanded={expanded === semester.id}
                    onClick={() =>
                      setExpanded((s) => (s === semester.id ? "" : semester.id))
                    }
                  >
                    <span>
                      {t("semesterNumber", { number: semester.number })}
                    </span>
                    <span className="semester-count">
                      {semester.subjects.length}
                    </span>
                    <ChevronDown
                      size={15}
                      className={expanded === semester.id ? "rotated" : ""}
                    />
                  </button>
                  {expanded === semester.id && (
                    <div className="semester-subjects">
                      {semester.subjects.map((subject) => (
                        <label
                          className={`course-choice ${selected?.semesterId === semester.id && selected.subject === subject ? "chosen" : ""}`}
                          key={subject}
                        >
                          <input
                            type="checkbox"
                            checked={
                              selected?.semesterId === semester.id &&
                              selected.subject === subject
                            }
                            onChange={(e) => {
                              onChange(
                                e.target.checked
                                  ? { semesterId: semester.id, subject }
                                  : null,
                              );
                              setOpen(false);
                              trigger.current?.focus();
                            }}
                          />
                          <span>{subject}</span>
                          {selected?.semesterId === semester.id &&
                            selected.subject === subject && <Check size={15} />}
                        </label>
                      ))}
                      {!semester.subjects.length && (
                        <p className="semester-empty">
                          {t("noSemesterSubjects")}
                        </p>
                      )}
                    </div>
                  )}
                </section>
              ))}
            </div>
            <button
              type="button"
              className="manage-curriculum"
              onClick={() => {
                setOpen(false);
                setManager(true);
              }}
            >
              <Settings2 size={16} />
              {t("manageCurriculum")}
            </button>
          </div>
        )}
      </div>
      <p
        className={`small course-help ${invalid && !selected ? "field-error" : "muted"}`}
        id={helpId}
      >
        {t(
          invalid && !selected ? "selectSubjectRequired" : "chooseSubjectHelp",
        )}
      </p>
      <button
        type="button"
        className="course-manage-link"
        onClick={() => {
          setOpen(false);
          setManager(true);
        }}
      >
        <Settings2 size={13} />
        {t("manageCurriculum")}
      </button>
      {manager && (
        <CurriculumManager
          catalog={catalog}
          onSave={onSave}
          onClose={() => {
            setManager(false);
            trigger.current?.focus();
          }}
        />
      )}
    </div>
  );
}
