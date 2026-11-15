import { z } from "zod";
import { authenticated, body, json, serve } from "../_shared/http.ts";
// Explicit creator-only operation. NEVER called by the normal learning/quiz loader.
serve(async (req) => {
  const { user, admin } = await authenticated(req);
  const { lessonId } = z
    .object({ lessonId: z.string().uuid() })
    .strict()
    .parse(await body(req));
  const { data, error } = await admin.rpc("creator_lesson", {
    p_user: user.id,
    p_lesson: lessonId,
  });
  if (error) throw error;
  return json(data);
});
