import { z } from "zod";
import { body, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { checkDuplicates } from "@/server/events/service";
import { isValidKey } from "@/lib/dates";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  startDate: z.string().refine(isValidKey, "Data inválida."),
  startTime: z.string().max(5).nullable().optional(),
});

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  return json({ duplicates: await checkDuplicates(user.id, (await params).id, await body(req, schema)) });
});
