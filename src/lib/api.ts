import { client } from "./supabase";
import type { LessonContent, PublicContent, Option } from "../schemas/lesson";
export type Lesson = {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  current_version: number;
  updated_at: string;
};
export type Version = {
  id: string;
  lesson_id: string;
  version: number;
  content: PublicContent;
};
export type AnswerResult = {
  questionId: string;
  questionText: string;
  options: Record<Option, string>;
  selected: Option | null;
  correctOption: Option;
  explanation: string;
  correct: boolean;
  sourcePage?: number;
};
export type Attempt = {
  id: string;
  lesson_id: string;
  lesson_version_id: string;
  attempt_number: number;
  score: number;
  correct_count: number;
  submitted_at: string;
  result: {
    title: string;
    subject: string;
    chapter: string;
    answers: AnswerResult[];
  };
};
async function check<T>(r: {
  data: T;
  error: unknown;
}): Promise<NonNullable<T>> {
  if (r.error) throw r.error;
  return r.data!;
}
export const api = {
  lessons: async () =>
    check(
      await client()
        .from("lessons")
        .select("*")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false }),
    ) as Promise<Lesson[]>,
  version: async (id: string) => {
    const l = await check(
      await client()
        .from("lessons")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .single(),
    );
    return check(
      await client()
        .from("lesson_versions")
        .select("id,lesson_id,version,content")
        .eq("lesson_id", id)
        .eq("version", l.current_version)
        .single(),
    ) as Promise<Version>;
  },
  attempts: async () =>
    check(
      await client()
        .from("quiz_attempts")
        .select("*")
        .order("submitted_at", { ascending: false }),
    ) as Promise<Attempt[]>,
  attempt: async (id: string) =>
    check(
      await client().from("quiz_attempts").select("*").eq("id", id).single(),
    ) as Promise<Attempt>,
  progress: async () =>
    check(await client().from("study_progress").select("*")) as Promise<
      {
        lesson_id: string;
        completed_at: string | null;
        last_studied_at: string;
      }[]
    >,
  touch: async (id: string, userId: string) =>
    check(
      await client()
        .from("study_progress")
        .upsert({
          lesson_id: id,
          user_id: userId,
          last_studied_at: new Date().toISOString(),
        }),
    ),
  complete: async (id: string, userId: string) =>
    check(
      await client().from("study_progress").upsert({
        lesson_id: id,
        user_id: userId,
        completed_at: new Date().toISOString(),
        last_studied_at: new Date().toISOString(),
      }),
    ),
  import: async (content: LessonContent, lessonId?: string) =>
    check(
      await client().functions.invoke("import-lesson", {
        body: { content, lessonId },
      }),
    ) as Promise<{ lessonId: string; duplicate: boolean }>,
  edit: async (lessonId: string) =>
    check(
      await client().functions.invoke("edit-lesson", { body: { lessonId } }),
    ) as Promise<LessonContent>,
  remove: async (id: string) =>
    check(await client().rpc("archive_lesson", { p_lesson: id })),
  grade: async (
    lessonId: string,
    versionId: string,
    answers: Record<string, Option>,
    submissionId: string,
  ) =>
    check(
      await client().functions.invoke("grade-quiz", {
        body: { lessonId, versionId, answers, submissionId },
      }),
    ) as Promise<{ attemptId: string }>,
  profile: async () =>
    check(await client().from("profiles").select("*").single()) as Promise<{
      display_name: string;
      language: "ko" | "vi";
      theme: "light" | "dark";
    }>,
  preferences: async (
    id: string,
    values: { display_name?: string; language?: string; theme?: string },
  ) => check(await client().from("profiles").update(values).eq("id", id)),
};
