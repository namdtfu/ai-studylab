import { it, expect } from "vitest";
import {
  draftKey,
  loadDraft,
  saveDraft,
  clearUserDrafts,
} from "../src/lib/draft";
it("isolates drafts by user and immutable version", () => {
  expect(draftKey("a", "v1")).not.toBe(draftKey("b", "v1"));
  expect(draftKey("a", "v1")).not.toBe(draftKey("a", "v2"));
});
it("preserves selection changes, ignores invalid options and unknown IDs", () => {
  const key = draftKey("a", "v");
  saveDraft(key, {
    submissionId: "00000000-0000-4000-8000-000000000001",
    answers: { q1: "A", q2: "B", q3: "E", other: "C" },
  });
  expect(loadDraft(key, ["q1", "q2", "q3"])).toEqual({
    submissionId: "00000000-0000-4000-8000-000000000001",
    answers: { q1: "A", q2: "B" },
  });
  saveDraft(key, {
    submissionId: "00000000-0000-4000-8000-000000000001",
    answers: { q1: "D" },
  });
  expect(loadDraft(key, ["q1"]).answers.q1).toBe("D");
});
it("survives damaged storage and cleans only signed-out user", () => {
  localStorage.setItem(draftKey("a", "v"), "bad");
  expect(loadDraft(draftKey("a", "v"), []).answers).toEqual({});
  saveDraft(draftKey("b", "v"), { a: 1 });
  clearUserDrafts("a");
  expect(localStorage.getItem(draftKey("a", "v"))).toBeNull();
  expect(localStorage.getItem(draftKey("b", "v"))).not.toBeNull();
});
