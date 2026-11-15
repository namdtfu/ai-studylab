-- Private semester/subject preferences, protected by the existing profile RLS.
-- Defaults requested by the project owner; each account edits its own copy.
alter table public.profiles add column curriculum jsonb not null default $catalog${"schemaVersion":"1.0","semesters":[{"id":"semester-1","number":1,"subjects":["수학 1","물리학 1"]},{"id":"semester-2","number":2,"subjects":["수학 2","물리학 2"]},{"id":"semester-3","number":3,"subjects":[]}]}$catalog$::jsonb;
alter table public.profiles add constraint profiles_curriculum_shape check (
  octet_length(curriculum::text) <= 30000 and
  extensions.json_matches_schema($schema${"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"schemaVersion":{"type":"string","const":"1.0"},"semesters":{"minItems":1,"maxItems":12,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-zA-Z0-9_-]{1,64}$"},"number":{"type":"integer","minimum":1,"maximum":12},"subjects":{"maxItems":50,"type":"array","items":{"type":"string","minLength":1,"maxLength":120}}},"required":["id","number","subjects"],"additionalProperties":false}}},"required":["schemaVersion","semesters"],"additionalProperties":false}$schema$::json, curriculum::json)
);
grant update(curriculum) on public.profiles to authenticated;
