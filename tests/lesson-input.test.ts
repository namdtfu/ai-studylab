import { it, expect } from "vitest";
import physics from "../examples/coulomb.json";
import { parseLessonInput, repairLessonInput } from "../src/lib/lesson-input";

it("accepts one copied JSON code block without accepting surrounding prose", () => {
  const raw = JSON.stringify(physics);
  expect(parseLessonInput("```json\n" + raw + "\n```")).toEqual(physics);
  expect(() =>
    parseLessonInput("Explanation\n```json\n" + raw + "\n```"),
  ).toThrow("invalidJson");
});
it("repairs mixed LaTeX escapes and literal string newlines without corrupting valid escapes", () => {
  const lesson = structuredClone(physics);
  lesson.summary = "__RAW_MATH__";
  const rawMath =
    String.raw`$\Phi_B$ $\frac{1}{2}$ $\theta$ $\tau$ $\text{V}$ $\nu$ $\rho$` +
    "\n" +
    String.raw`$\\ell$\nNext line`;
  const raw = JSON.stringify(lesson).replace("__RAW_MATH__", rawMath);
  const repaired = repairLessonInput(raw);
  expect(repaired.content.summary).toBe(
    String.raw`$\Phi_B$ $\frac{1}{2}$ $\theta$ $\tau$ $\text{V}$ $\nu$ $\rho$` +
      "\n" +
      String.raw`$\ell$` +
      "\nNext line",
  );
  expect(repaired.content.questions).toEqual(physics.questions);
  expect(repairLessonInput(repaired.raw).raw).toBe(repaired.raw);
});
it("preserves quotes, JSON escapes, unicode escapes and normal text", () => {
  const lesson = structuredClone(physics);
  lesson.summary = 'Quoted "text", slash \\, tab\t, newline\n, unicode θ';
  const raw = JSON.stringify(lesson).replace("θ", String.raw`\u03b8`);
  expect(repairLessonInput(raw).content).toEqual(lesson);
});
it("keeps strict question count, keys and size limits after repair", () => {
  expect(() => repairLessonInput('{"summary":"only summary"}')).toThrow();
  expect(() =>
    repairLessonInput(
      JSON.stringify({ ...physics, questions: physics.questions.slice(0, 9) }),
    ),
  ).toThrow();
  expect(() => repairLessonInput(" ".repeat(1000001))).toThrow("tooLarge");
  expect(() => repairLessonInput("Create a lesson about physics")).toThrow(
    "invalidJson",
  );
  expect(() => repairLessonInput('{"missingComma":1 "x":2}')).toThrow(
    "invalidJson",
  );
});
