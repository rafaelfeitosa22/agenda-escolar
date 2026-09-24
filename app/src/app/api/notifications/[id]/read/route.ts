import { json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { markRead } from "@/server/notifications/service";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await markRead(user.id, (await params).id);
  return json({ ok: true });
});
