import { MAX_JSON_BYTES, parseLesson } from "../schemas/lesson";

// Only unwrap a single enclosing code block; never extract JSON from prose.
export function unwrapLessonInput(raw: string): string {
  if (new TextEncoder().encode(raw).length > MAX_JSON_BYTES)
    throw new Error("tooLarge");
  const text = raw.replace(/^\uFEFF/, "").trim();
  return text.match(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i)?.[1] ?? text;
}

export function parseLessonInput(raw: string) {
  return parseLesson(unwrapLessonInput(raw));
}

// These LaTeX commands start with valid JSON escape letters. Without this
// distinction, JSON.parse silently turns \frac, \theta, etc. into controls.
const ambiguousMathCommands = new Set(
  (
    "bar beta begin big bigg binom bmod boldsymbol boxed breve backslash " +
    "frac forall flat fbox " +
    "nu nabla neg ne neq not notin nexists nonumber newcommand " +
    "rho right rightarrow rangle rceil rfloor rm rule root " +
    "tau theta text textnormal textbf textit textrm textsf texttt textcolor " +
    "times tan tanh tfrac tilde tag tiny top triangle triangleq therefore to"
  ).split(" "),
);

// Explicit, user-triggered syntax recovery. Preserve existing JSON escapes,
// repair raw controls and unescaped LaTeX, then require the SAME lesson schema.
// This does not guess missing fields, answers, commas, or mathematical meaning.
export function repairLessonInput(raw: string) {
  const source = unwrapLessonInput(raw);
  let output = "",
    inString = false,
    inMath = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      inString = !inString;
      inMath = false;
      output += char;
      continue;
    }
    if (!inString) {
      output += char;
      continue;
    }
    if (char === "$") {
      inMath = !inMath;
      if (source[i + 1] === "$") {
        output += "$";
        i++;
      }
      output += "$";
      continue;
    }
    if (char === "\\") {
      const next = source[i + 1];
      if (next === undefined) {
        output += char;
        continue;
      }
      const command = source.slice(i + 1).match(/^[a-zA-Z]+/)?.[0];
      const latex = inMath && !!command && ambiguousMathCommands.has(command);
      const validEscape =
        '"\\/bfnrt'.includes(next) ||
        (next === "u" && /^[\da-fA-F]{4}/.test(source.slice(i + 2, i + 6)));
      if (latex || !validEscape) output += "\\\\";
      else {
        output += char + next;
        i++;
      }
      continue;
    }
    output +=
      char.charCodeAt(0) < 32 ? JSON.stringify(char).slice(1, -1) : char;
  }
  const content = parseLesson(output);
  return { raw: JSON.stringify(content, null, 2), content };
}
