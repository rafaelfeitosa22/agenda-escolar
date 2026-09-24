import { body, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { joinClass, joinSchema } from "@/server/classes/service";

export const POST = route(async (req) => {
  const user = await requireUser();
  const { code } = await body(req, joinSchema);
  return json(await joinClass(user.id, code));
});
