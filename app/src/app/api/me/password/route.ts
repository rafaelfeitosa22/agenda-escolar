import { body, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { changePassword, changePasswordSchema } from "@/server/auth/service";

export const PUT = route(async (req) => {
  const user = await requireUser();
  const { current, password } = await body(req, changePasswordSchema);
  await changePassword(user.id, current, password);
  return json({ ok: true });
});
