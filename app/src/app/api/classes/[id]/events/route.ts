import { body, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { createEvent, createEventSchema, listEvents } from "@/server/events/service";
import { isValidKey } from "@/lib/dates";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const q = new URL(req.url).searchParams;
  const date = (k: string) => {
    const v = q.get(k);
    return v && isValidKey(v) ? v : undefined;
  };
  const events = await listEvents(user.id, (await params).id, {
    from: date("from"),
    to: date("to"),
    mine: q.get("mine") === "1",
    q: q.get("q")?.slice(0, 100) || undefined,
    type: q.get("type") || undefined,
  });
  return json({ events });
});

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const event = await createEvent(user.id, (await params).id, await body(req, createEventSchema));
  return json({ event }, 201);
});
