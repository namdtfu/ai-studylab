import { z } from "zod";
import { authenticated, body, json, serve } from "../_shared/http.ts";
const submission = z
  .object({
    lessonId: z.string().uuid(),
    versionId: z.string().uuid(),
    submissionId: z.string().uuid(),
    answers: z
      .record(z.string().max(64), z.enum(["A", "B", "C", "D"]))
      .refine((v) => Object.keys(v).length <= 10),
  })
  .strict();
serve(async (req) => {
  const { user, admin } = await authenticated(req);
  const input = submission.parse(await body(req));
  const { data, error } = await admin.rpc("grade_private_quiz", {
    p_user: user.id,
    p_lesson: input.lessonId,
    p_version: input.versionId,
    p_answers: input.answers,
    p_submission: input.submissionId,
  });
  if (error) throw error;
  return json(data);
});
