import { z } from "zod";
import { writeFileSync } from "node:fs";
import { curriculumBaseSchema, defaultCurriculum } from "../src/lib/curriculum";
const schema = JSON.stringify(
  z.toJSONSchema(curriculumBaseSchema, { target: "draft-7" }),
);
const initial = JSON.stringify(defaultCurriculum);
writeFileSync(
  "supabase/migrations/202611150005_curriculum.sql",
  `-- Private semester/subject preferences, protected by the existing profile RLS.\n-- Defaults requested by the project owner; each account edits its own copy.\nalter table public.profiles add column curriculum jsonb not null default $catalog$${initial}$catalog$::jsonb;\nalter table public.profiles add constraint profiles_curriculum_shape check (\n  octet_length(curriculum::text) <= 30000 and\n  extensions.json_matches_schema($schema$${schema}$schema$::json, curriculum::json)\n);\ngrant update(curriculum) on public.profiles to authenticated;\n`,
);
