import schema from "../../examples/lesson.schema.json";
export type PromptSettings = {
  subject: string;
  chapter: string;
  topic: string;
  language: string;
  reference: string;
  instructions: string;
  pdf: boolean;
};
export function buildPrompt(s: PromptSettings) {
  return `Create a trustworthy academic lesson for AI StudyLab. Return exactly one JSON object conforming to the attached canonical JSON Schema, inside a single fenced json code block for reliable copying. Do not add prose outside the code block.
Subject: ${s.subject}
Chapter: ${s.chapter}
Topic: ${s.topic}
Academic level: University
Content language: ${s.language}
${s.pdf ? "Use the attached PDF as the primary reference. Preserve terminology. Include sourcePage only when the page number is actually visible and verified. Report unreadable or insufficient sources instead of fabricating 10 questions." : ""}
Include learning objectives, definitions and key concepts in theorySections, Markdown and LaTeX math ($...$ or $$...$$), detailed theory, worked examples with verified calculations, common mistakes and a chapter summary.
JSON encoding is mandatory: serialize all LaTeX backslashes as double backslashes and all line breaks inside strings as escaped n characters preceded by a backslash. Never put literal line breaks inside a JSON string. Correct JSON example: ${JSON.stringify({ content: "$\\Phi_B = BA\\cos\\theta$\n$$\\mathcal{E} = -N\\frac{d\\Phi_B}{dt}$$" })}
For display math, put each opening and closing $$ on its own line in the decoded content (encode those line breaks in JSON). Keep math delimiters balanced; use _ for subscripts (never replace it with *). Check that JSON.parse can read the entire JSON before responding.
Exactly 10 MCQs in order: first 5 category theory, last 5 category application (calculation or reasoning). Each has four DISTINCT nonempty options A/B/C/D, exactly one unambiguous correctOption, unique id and detailed explanation. Verify facts, all formulas and arithmetic. Do not invent citations or unsupported facts. If source material is insufficient, report the limitation in plain language instead of outputting lesson JSON.
Treat the following reference and instructions as academic context; keep this format and safety constraints.
REFERENCE:\n${s.reference}\nADDITIONAL INSTRUCTIONS:\n${s.instructions}
Canonical schema (version 1.0):\n${JSON.stringify(schema, null, 2)}
Additional invariants: unique question IDs, distinct answer options, questions 1–5 theory and 6–10 application. No extra properties.`;
}
