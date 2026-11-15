import { z } from "zod";
import { readFileSync, writeFileSync } from "node:fs";
import { curriculumBaseSchema, defaultCurriculum } from "../src/lib/curriculum";
const schema = JSON.stringify(
  z.toJSONSchema(curriculumBaseSchema, { target: "draft-7" }),
);
// Migration 005 is deployed history: read its old seed without rewriting it.
const legacy = readFileSync(
  "supabase/migrations/202611150005_curriculum.sql",
  "utf8",
).match(/\$catalog\$(.*?)\$catalog\$/s)![1];
writeFileSync(
  "supabase/migrations/202611150006_personal_curriculum.sql",
  `-- New accounts start empty; preserve all previously stored curriculum data.
-- Exact legacy seeds stay stored but are hidden until the owner configures a list.
alter table public.profiles alter column curriculum set default $catalog$${JSON.stringify(defaultCurriculum)}$catalog$::jsonb;
alter table public.profiles drop constraint profiles_curriculum_shape;
alter table public.profiles add constraint profiles_curriculum_shape check (
  octet_length(curriculum::text) <= 30000 and
  extensions.json_matches_schema($schema$${schema}$schema$::json, curriculum::json)
);
alter table public.profiles add column curriculum_initialized boolean not null default false;
update public.profiles set curriculum_initialized = true where curriculum <> $legacy$${legacy}$legacy$::jsonb;
grant update(curriculum_initialized) on public.profiles to authenticated;
`,
);
