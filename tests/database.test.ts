// PostgreSQL execution tests: actual PL/pgSQL, RLS, grants and atomic transactions.
// PGlite lacks pg_jsonschema. Only that extension is replaced with a no-op here;
// canonical structure validation is separately exercised by schema.test.ts.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import physics from "../examples/coulomb.json";
let db: PGlite;
const owner = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
let lesson: string, version: string, attemptId: string;
async function rpc(name: string, args: unknown[]) {
  const r = await db.query<{ result: any }>(
    `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
    args,
  );
  return r.rows[0].result;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  const tables = readFileSync(
    "supabase/migrations/202611150001_tables.sql",
    "utf8",
  ).replace(
    "create extension if not exists pg_jsonschema with schema extensions;",
    "",
  );
  await db.exec(tables);
  await db.exec(
    `create function extensions.json_matches_schema(s json,p json) returns boolean language sql immutable as $$ select true $$;`,
  );
  await db.exec(readFileSync("supabase/migrations/202611150002_schema.sql","utf8"));
  await db.exec(
    readFileSync("supabase/migrations/202611150003_operations.sql", "utf8"),
  );
  await db.query("insert into auth.users values($1,$3),($2,$3)", [
    owner,
    other,
    {},
  ]);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("imports privately, separates keys and deduplicates content", async () => {
  const r = await rpc("import_private_lesson", [owner, physics, null]);
  lesson = r.lessonId;
  expect(r.duplicate).toBe(false);
  const versions = await db.query<any>(
    "select * from public.lesson_versions where lesson_id=$1",
    [lesson],
  );
  version = versions.rows[0].id;
  const content = versions.rows[0].content;
  expect(content.questions).toHaveLength(10);
  expect(JSON.stringify(content)).not.toContain("correctOption");
  expect(JSON.stringify(content)).not.toContain("explanation");
  expect(await rpc("import_private_lesson", [owner, physics, null])).toEqual({
    lessonId: lesson,
    duplicate: true,
  });
});
it("enforces cross-user RLS and protects privileged operations", async () => {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${other}',false);`,
  );
  try {
    expect((await db.query("select * from public.lessons")).rows).toHaveLength(
      0,
    );
    expect(
      (await db.query("select * from public.lesson_versions")).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from public.profiles")).rows).toHaveLength(
      1,
    );
    await expect(
      db.query("select * from private.answer_keys"),
    ).rejects.toThrow();
    await expect(rpc("creator_lesson", [other, lesson])).rejects.toThrow();
    await expect(
      rpc("import_private_lesson", [other, physics, null]),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.study_progress(lesson_id,user_id) values($1,$2)",
        [lesson, other],
      ),
    ).rejects.toThrow();
  } finally {
    await db.exec("reset role");
  }
});
it("rejects wrong ownership, unknown IDs, invalid options and forged scores", async () => {
  await expect(
    rpc("grade_private_quiz", [
      other,
      lesson,
      version,
      {},
      crypto.randomUUID(),
    ]),
  ).rejects.toThrow("lesson_not_found");
  await expect(
    rpc("grade_private_quiz", [
      owner,
      lesson,
      version,
      { unknown: "A" },
      crypto.randomUUID(),
    ]),
  ).rejects.toThrow("invalid_answers");
  await expect(
    rpc("grade_private_quiz", [
      owner,
      lesson,
      version,
      { q1: "E" },
      crypto.randomUUID(),
    ]),
  ).rejects.toThrow("invalid_answers");
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`,
  );
  try {
    await expect(
      db.query(
        "insert into public.quiz_attempts(user_id,score) values($1,100)",
        [owner],
      ),
    ).rejects.toThrow();
    await expect(
      rpc("grade_private_quiz", [
        owner,
        lesson,
        version,
        {},
        crypto.randomUUID(),
      ]),
    ).rejects.toThrow();
  } finally {
    await db.exec("reset role");
  }
});
it("grades unanswered questions as wrong, stores snapshot and makes retries idempotent", async () => {
  const submission = crypto.randomUUID();
  const answers = { q1: "A", q2: "A" };
  const r = await rpc("grade_private_quiz", [
    owner,
    lesson,
    version,
    answers,
    submission,
  ]);
  attemptId = r.attemptId;
  expect(
    await rpc("grade_private_quiz", [
      owner,
      lesson,
      version,
      answers,
      submission,
    ]),
  ).toEqual(r);
  await expect(
    rpc("grade_private_quiz", [owner, lesson, version, {}, submission]),
  ).rejects.toThrow("submission_conflict");
  const result = (
    await db.query<any>("select * from public.quiz_attempts where id=$1", [
      attemptId,
    ])
  ).rows[0];
  expect(result.score).toBe(10);
  expect(result.correct_count).toBe(1);
  expect(result.attempt_number).toBe(1);
  expect(result.result.answers).toHaveLength(10);
  expect(result.result.answers[2].selected).toBeNull();
  expect(result.result.answers[2].correct).toBe(false);
});
it("allows unlimited retakes, preserves historical results across edits and rejects cross-version misuse", async () => {
  const answers = Object.fromEntries(
    physics.questions.map((q) => [q.id, q.correctOption]),
  );
  const r = await rpc("grade_private_quiz", [
    owner,
    lesson,
    version,
    answers,
    crypto.randomUUID(),
  ]);
  const perfect = (
    await db.query<any>("select * from public.quiz_attempts where id=$1", [
      r.attemptId,
    ])
  ).rows[0];
  expect(perfect.score).toBe(100);
  expect(perfect.attempt_number).toBe(2);
  const updated = structuredClone(physics);
  updated.title = "Revised";
  updated.questions[0].correctOption = "B";
  await rpc("import_private_lesson", [owner, updated, lesson]);
  const old = (
    await db.query<any>("select * from public.quiz_attempts where id=$1", [
      attemptId,
    ])
  ).rows[0];
  expect(old.result.title).toBe(physics.title);
  expect(old.result.answers[0].correctOption).toBe("A");
  const oldVersionResult = await rpc("grade_private_quiz", [
    owner,
    lesson,
    version,
    answers,
    crypto.randomUUID(),
  ]);
  expect(oldVersionResult.attemptId).toBeTruthy();
  const creator = await rpc("creator_lesson", [owner, lesson]);
  expect(creator.title).toBe("Revised");
  expect(creator.questions[0].correctOption).toBe("B");
});
it("denies access to other users attempts and makes completed attempts immutable", async () => {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${other}',false);`,
  );
  try {
    expect(
      (await db.query("select * from public.quiz_attempts")).rows,
    ).toHaveLength(0);
  } finally {
    await db.exec("reset role");
  }
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`,
  );
  try {
    expect(
      (await db.query("select * from public.quiz_attempts")).rows,
    ).toHaveLength(3);
    await expect(
      db.query("update public.quiz_attempts set score=100 where id=$1", [
        attemptId,
      ]),
    ).rejects.toThrow();
    await expect(
      db.query("delete from public.quiz_attempts where id=$1", [attemptId]),
    ).rejects.toThrow();
    await rpc("archive_lesson", [lesson]);
    expect(
      (await db.query("select * from public.quiz_attempts")).rows,
    ).toHaveLength(3);
  } finally {
    await db.exec("reset role");
  }
});
