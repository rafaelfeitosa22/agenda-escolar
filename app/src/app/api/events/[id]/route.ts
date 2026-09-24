import { body, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { deleteEvent, getEvent, updateEvent, updateEventSchema } from "@/server/events/service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  return json({ event: await getEvent(user.id, (await params).id) });
});

export const PUT = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  return json({ event: await updateEvent(user.id, (await params).id, await body(req, updateEventSchema)) });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  return json(await deleteEvent(user.id, (await params).id));
});
