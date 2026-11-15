import { z } from "zod";
import { baseLessonSchema } from "../src/schemas/lesson";
import { writeFileSync } from "node:fs";
const schema = z.toJSONSchema(baseLessonSchema, { target: "draft-7" });
writeFileSync(
  "examples/lesson.schema.json",
  JSON.stringify(schema, null, 2) + "\n",
);
// Database structure validator is generated from the SAME schema, never maintained by hand.
writeFileSync(
  "supabase/migrations/202611150002_schema.sql",
  `create or replace function private.valid_lesson(p jsonb) returns boolean language sql immutable set search_path = '' as $fn$ select extensions.json_matches_schema($schema$${JSON.stringify(schema)}$schema$::json, p::json); $fn$;\n`,
);
