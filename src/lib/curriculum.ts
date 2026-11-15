import { z } from "zod";

export const semesterSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    number: z.number().int().min(1).max(12),
    subjects: z.array(z.string().trim().min(1).max(120)).max(50),
  })
  .strict();
export const curriculumBaseSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    semesters: z.array(semesterSchema).min(1).max(12),
  })
  .strict();
export const curriculumSchema = curriculumBaseSchema.superRefine(
  (catalog, ctx) => {
    const ids = new Set<string>(),
      numbers = new Set<number>();
    catalog.semesters.forEach((semester, i) => {
      if (ids.has(semester.id) || numbers.has(semester.number))
        ctx.addIssue({
          code: "custom",
          message: "duplicateSemester",
          path: ["semesters", i],
        });
      ids.add(semester.id);
      numbers.add(semester.number);
      if (
        new Set(semester.subjects.map((s) => s.toLocaleLowerCase())).size !==
        semester.subjects.length
      )
        ctx.addIssue({
          code: "custom",
          message: "duplicateSubject",
          path: ["semesters", i, "subjects"],
        });
    });
  },
);
export type Curriculum = z.infer<typeof curriculumSchema>;
export type CourseSelection = { semesterId: string; subject: string };
export const defaultCurriculum: Curriculum = {
  schemaVersion: "1.0",
  semesters: [
    { id: "semester-1", number: 1, subjects: ["수학 1", "물리학 1"] },
    { id: "semester-2", number: 2, subjects: ["수학 2", "물리학 2"] },
    { id: "semester-3", number: 3, subjects: [] },
  ],
};
export function hasCourse(
  catalog: Curriculum,
  selected: CourseSelection | null,
): boolean {
  return (
    !!selected &&
    catalog.semesters.some(
      (s) =>
        s.id === selected.semesterId && s.subjects.includes(selected.subject),
    )
  );
}
