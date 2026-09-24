import { body, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { profileSchema, updateProfile } from "@/server/auth/service";
import { listClasses } from "@/server/classes/service";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ user, classes: await listClasses(user.id) });
});

export const PUT = route(async (req) => {
  const user = await requireUser();
  return json({ user: await updateProfile(user.id, await body(req, profileSchema)) });
});
