import { json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { listMembers } from "@/server/classes/service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  return json({ members: await listMembers(user.id, (await params).id) });
});
