import { body, json, route } from "@/server/http";
import { resetPassword, resetSchema } from "@/server/auth/service";

export const POST = route(async (req) => {
  const { token, password } = await body(req, resetSchema);
  await resetPassword(token, password);
  return json({ ok: true });
});
