import { json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { leaveClass } from "@/server/classes/service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  return json(await leaveClass(user.id, (await params).id));
});
