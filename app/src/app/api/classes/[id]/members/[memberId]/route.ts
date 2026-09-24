import { body, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { memberUpdateSchema, updateMember } from "@/server/classes/service";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

export const PUT = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id, memberId } = await params;
  return json(await updateMember(user.id, id, memberId, await body(req, memberUpdateSchema)));
});
