import { z } from "zod";
export const MAX_JSON_BYTES = 1_000_000;
const text = z.string().trim().min(1).max(30000);
export const optionSchema = z.enum(["A", "B", "C", "D"]);
export const questionSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    category: z.enum(["theory", "application"]),
    questionText: text,
    options: z.object({ A: text, B: text, C: text, D: text }).strict(),
    correctOption: optionSchema,
    explanation: text,
    sourcePage: z.number().int().positive().max(100000).optional(),
  })
  .strict();
export const baseLessonSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    subject: text.max(120),
    chapter: text.max(120),
    title: text.max(200),
    language: z.string().min(2).max(40),
    academicLevel: text.max(100),
    learningObjectives: z.array(text).min(1).max(20),
    theorySections: z
      .array(
        z
          .object({
            heading: text.max(200),
            content: text,
            example: text.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(40),
    workedExamples: z
      .array(
        z
          .object({ title: text.max(200), problem: text, solution: text })
          .strict(),
      )
      .min(1)
      .max(20),
    commonMistakes: z.array(text).min(1).max(20),
    summary: text,
    questions: z.array(questionSchema).length(10),
  })
  .strict();
export const lessonSchema = baseLessonSchema.superRefine((lesson, ctx) => {
  const ids = new Set<string>();
  lesson.questions.forEach((q, i) => {
    const fail = (message: string, path: (string | number)[]) =>
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["questions", i, ...path],
      });
    if (ids.has(q.id)) fail("duplicateId", ["id"]);
    ids.add(q.id);
    if (q.category !== (i < 5 ? "theory" : "application"))
      fail("questionOrder", ["category"]);
    if (new Set(Object.values(q.options)).size !== 4)
      fail("duplicateOptions", ["options"]);
  });
});
export type LessonContent = z.infer<typeof lessonSchema>;
export type Question = z.infer<typeof questionSchema>;
export type PublicQuestion = Omit<Question, "correctOption" | "explanation">;
export type PublicContent = Omit<LessonContent, "questions"> & {
  questions: PublicQuestion[];
};
export type Option = z.infer<typeof optionSchema>;
export function parseLesson(raw: string): LessonContent {
  if (new TextEncoder().encode(raw).length > MAX_JSON_BYTES)
    throw new Error("tooLarge");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("invalidJson");
  }
  return lessonSchema.parse(value);
}
export function validationIssues(
  error: unknown,
): { path: string; key: string }[] {
  if (error instanceof z.ZodError)
    return error.issues.map((e) => ({
      path: e.path.join("."),
      key: ["duplicateId", "questionOrder", "duplicateOptions"].includes(
        e.message,
      )
        ? e.message
        : e.code === "too_small" || e.code === "too_big"
          ? e.path.join(".") === "questions"
            ? "tenQuestions"
            : "required"
          : e.code === "unrecognized_keys"
            ? "unknownFields"
            : "invalidField",
    }));
  return [
    {
      path: "JSON",
      key: error instanceof Error ? error.message : "invalidJson",
    },
  ];
}
export function publicContent(content: LessonContent): PublicContent {
  return {
    ...content,
    questions: content.questions.map(
      ({ correctOption: _c, explanation: _e, ...q }) => q,
    ),
  };
}
