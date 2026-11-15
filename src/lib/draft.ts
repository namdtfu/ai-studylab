import { optionSchema, type Option } from "../schemas/lesson";
export function draftKey(user: string, version: string) {
  return `studylab:draft:${user}:${version}`;
}
export function loadDraft(
  key: string,
  ids: string[],
): { answers: Record<string, Option>; submissionId: string } {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "null");
    if (
      data &&
      typeof data.submissionId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        data.submissionId,
      )
    )
      return {
        submissionId: data.submissionId,
        answers: Object.fromEntries(
          Object.entries(data.answers || {}).filter(
            ([id, a]) => ids.includes(id) && optionSchema.safeParse(a).success,
          ),
        ) as Record<string, Option>,
      };
  } catch {
    /* damaged drafts are safely reset */
  }
  return { answers: {}, submissionId: crypto.randomUUID() };
}
export function saveDraft(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}
export function clearUserDrafts(user: string) {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(`studylab:draft:${user}:`))
    .forEach((k) => localStorage.removeItem(k));
}
