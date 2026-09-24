import { body, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { getClass, updateClass, updateClassSchema } from "@/server/classes/service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  return json({ class: await getClass(user.id, (await params).id) });
});

export const PUT = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  return json({ class: await updateClass(user.id, (await params).id, await body(req, updateClassSchema)) });
});
