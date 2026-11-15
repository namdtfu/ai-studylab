import { describe, it, expect } from "vitest";
import {
  lessonSchema,
  parseLesson,
  validationIssues,
  publicContent,
} from "../src/schemas/lesson";
import physics from "../examples/coulomb.json";
import calculus from "../examples/partial-derivatives.json";
import { buildPrompt } from "../src/lib/prompt";
import schema from "../examples/lesson.schema.json";
import { z } from "zod";
import { baseLessonSchema } from "../src/schemas/lesson";
import { readFileSync } from "node:fs";
describe("canonical content validation", () => {
  it.each([physics, calculus])("accepts complete educational samples", (s) => {
    const parsed = lessonSchema.parse(s);
    expect(parsed.questions).toHaveLength(10);
    expect(
      parsed.questions.slice(0, 5).every((q) => q.category === "theory"),
    ).toBe(true);
    expect(
      parsed.questions.slice(5).every((q) => q.category === "application"),
    ).toBe(true);
    expect(
      parsed.questions.every((q) => Object.keys(q.options).length === 4),
    ).toBe(true);
  });
  it("rejects malformed JSON and markdown fences", () => {
    expect(() => parseLesson("{bad")).toThrow("invalidJson");
    expect(() => parseLesson("```json\n{}\n```")).toThrow();
  });
  it("rejects oversized content", () =>
    expect(() => parseLesson(" ".repeat(1000001))).toThrow("tooLarge"));
  it.each([
    "title",
    "subject",
    "learningObjectives",
    "schemaVersion",
    "summary",
  ])("requires %s", (key) => {
    const c = structuredClone(physics) as Record<string, unknown>;
    delete c[key];
    expect(lessonSchema.safeParse(c).success).toBe(false);
  });
  it("rejects unsupported version", () =>
    expect(
      lessonSchema.safeParse({ ...physics, schemaVersion: "2.0" }).success,
    ).toBe(false));
  it.each([0, 9, 11])("rejects %i questions", (n) => {
    const c = structuredClone(physics);
    c.questions = Array.from({ length: n }, (_, i) => ({
      ...physics.questions[i % 10],
      id: `q${i}`,
    }));
    expect(lessonSchema.safeParse(c).success).toBe(false);
  });
  it("rejects duplicate IDs", () => {
    const c = structuredClone(physics);
    c.questions[1].id = c.questions[0].id;
    expect(validationIssues(lessonSchema.safeParse(c).error)).toContainEqual({
      path: "questions.1.id",
      key: "duplicateId",
    });
  });
  it("rejects wrong category order", () => {
    const c = structuredClone(physics);
    [c.questions[0].category, c.questions[5].category] = [
      c.questions[5].category,
      c.questions[0].category,
    ];
    expect(lessonSchema.safeParse(c).success).toBe(false);
  });
  it.each(["missing", "extra", "empty", "duplicated"])(
    "rejects %s options",
    (kind) => {
      const c = structuredClone(physics);
      const o = c.questions[0].options as Record<string, string>;
      if (kind === "missing") delete o.D;
      if (kind === "extra") o.E = "extra";
      if (kind === "empty") o.A = "  ";
      if (kind === "duplicated") o.B = o.A;
      expect(lessonSchema.safeParse(c).success).toBe(false);
    },
  );
  it("requires explanations and one valid key", () => {
    for (const value of ["", null, 42]) {
      const c = structuredClone(physics);
      Object.assign(c.questions[0], { explanation: value, correctOption: "E" });
      expect(lessonSchema.safeParse(c).success).toBe(false);
    }
  });
  it("never exposes keys or explanations in public content", () => {
    const clean = publicContent(lessonSchema.parse(physics));
    expect(JSON.stringify(clean)).not.toContain("correctOption");
    expect(JSON.stringify(clean)).not.toContain("explanation");
  });
  it("exports the same schema for prompt and SQL validator", () => {
    expect(schema).toEqual(
      z.toJSONSchema(baseLessonSchema, { target: "draft-7" }),
    );
    const prompt = buildPrompt({
      subject: "Custom subject",
      chapter: "Chapter",
      topic: "Topic",
      language: "vi",
      reference: "",
      instructions: "",
      pdf: true,
    });
    expect(prompt).toContain(JSON.stringify(schema, null, 2));
    expect(prompt).toContain("sourcePage");
    const sql = readFileSync(
      "supabase/migrations/202611150002_schema.sql",
      "utf8",
    );
    expect(sql).toContain(JSON.stringify(schema));
  });
});
