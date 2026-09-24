import { body, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { createClass, createClassSchema, listClasses } from "@/server/classes/service";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ classes: await listClasses(user.id) });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const cls = await createClass(user.id, await body(req, createClassSchema));
  return json({ class: { id: cls.id, name: cls.name, inviteCode: cls.inviteCode } }, 201);
});
