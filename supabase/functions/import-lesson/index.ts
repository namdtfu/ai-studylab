import { z } from "zod";
import { lessonSchema } from "../_shared/lesson.ts";
import { authenticated, body, json, serve } from "../_shared/http.ts";
serve(async (req) => {
  const { user, admin } = await authenticated(req);
  const input = z
    .object({ content: lessonSchema, lessonId: z.string().uuid().optional() })
    .strict()
    .parse(await body(req));
  const { data, error } = await admin.rpc("import_private_lesson", {
    p_user: user.id,
    p_content: input.content,
    p_lesson: input.lessonId ?? null,
  });
  if (error) throw error;
  return json(data);
});
