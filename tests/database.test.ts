// PostgreSQL execution tests: actual PL/pgSQL, RLS, grants and atomic transactions.
// PGlite lacks pg_jsonschema. Only that extension is replaced with a no-op here;
// canonical structure validation is separately exercised by schema.test.ts.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import physics from "../examples/coulomb.json";
import {
  defaultCurriculum,
  personalCurriculum,
  type Curriculum,
} from "../src/lib/curriculum";
const legacyCatalog: Curriculum = JSON.parse(
  readFileSync("supabase/migrations/202611150005_curriculum.sql", "utf8").match(
    /\$catalog\$(.*?)\$catalog\$/s,
  )![1],
);
const existingPersonal = structuredClone(legacyCatalog);
existingPersonal.semesters[0].subjects = ["화학 전공"];
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
  await db.exec(
    readFileSync("supabase/migrations/202611150002_schema.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202611150003_operations.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202611150005_curriculum.sql", "utf8"),
  );
  await db.query("insert into auth.users values($1,$3),($2,$3)", [
    owner,
    other,
    {},
  ]);
  await db.query("update public.profiles set curriculum=$1 where id=$2", [
    existingPersonal,
    owner,
  ]);
  await db.exec(
    readFileSync(
      "supabase/migrations/202611150006_personal_curriculum.sql",
      "utf8",
    ),
  );
  await db.query("insert into auth.users values($1,$2)", [
    "00000000-0000-4000-8000-000000000003",
    {},
  ]);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("migrates custom curricula intact, hides old seeds and starts newly registered accounts empty", async () => {
  const own = await db.query<any>(
    "select curriculum,curriculum_initialized from public.profiles where id=$1",
    [owner],
  );
  expect(own.rows[0].curriculum_initialized).toBe(true);
  expect(personalCurriculum(own.rows[0])).toEqual(existingPersonal);
  const seeded = await db.query<any>(
    "select curriculum,curriculum_initialized from public.profiles where id=$1",
    [other],
  );
  expect(seeded.rows[0].curriculum).toEqual(legacyCatalog);
  expect(seeded.rows[0].curriculum_initialized).toBe(false);
  expect(personalCurriculum(seeded.rows[0])).toEqual(defaultCurriculum);
  const fresh = await db.query<any>(
    "select curriculum,curriculum_initialized from public.profiles where id=$1",
    ["00000000-0000-4000-8000-000000000003"],
  );
  expect(fresh.rows[0].curriculum).toEqual(defaultCurriculum);
  expect(fresh.rows[0].curriculum_initialized).toBe(false);
});
it("stores each user's curriculum privately and blocks updates to another profile", async () => {
  const initial = await db.query<{ curriculum: unknown }>(
    "select curriculum from public.profiles where id=$1",
    [owner],
  );
  expect(initial.rows[0].curriculum).toEqual(existingPersonal);
  const edited = structuredClone(existingPersonal);
  edited.semesters[0].subjects.push("화학 1");
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`,
  );
  try {
    const saved = await db.query<{ curriculum: unknown }>(
      "update public.profiles set curriculum=$1,curriculum_initialized=true where id=$2 returning curriculum",
      [edited, owner],
    );
    expect(saved.rows[0].curriculum).toEqual(edited);
    const forbidden = await db.query(
      "update public.profiles set curriculum=$1 where id=$2 returning id",
      [edited, other],
    );
    expect(forbidden.rows).toHaveLength(0);
    expect((await db.query("select id from public.profiles")).rows).toEqual([
      { id: owner },
    ]);
  } finally {
    await db.exec("reset role");
  }
  const untouched = await db.query<{ curriculum: unknown }>(
    "select curriculum from public.profiles where id=$1",
    [other],
  );
  expect(untouched.rows[0].curriculum).toEqual(legacyCatalog);
});
it("allows two majors to keep different lists without reading or changing each other", async () => {
  const catalog: Curriculum = {
    schemaVersion: "1.0",
    semesters: [{ id: "economics", number: 1, subjects: ["경제학 입문"] }],
  };
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${other}',false);`,
  );
  try {
    const saved = await db.query<any>(
      "update public.profiles set curriculum=$1,curriculum_initialized=true where id=$2 returning curriculum,curriculum_initialized",
      [catalog, other],
    );
    expect(personalCurriculum(saved.rows[0])).toEqual(catalog);
    expect(
      (
        await db.query("select curriculum from public.profiles where id=$1", [
          owner,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          "update public.profiles set curriculum_initialized=false where id=$1 returning id",
          [owner],
        )
      ).rows,
    ).toHaveLength(0);
  } finally {
    await db.exec("reset role");
  }
  const own = await db.query<any>(
    "select curriculum,curriculum_initialized from public.profiles where id=$1",
    [owner],
  );
  expect(personalCurriculum(own.rows[0]).semesters[0].subjects).toContain(
    "화학 전공",
  );
  expect(JSON.stringify(personalCurriculum(own.rows[0]))).not.toContain(
    "경제학 입문",
  );
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
