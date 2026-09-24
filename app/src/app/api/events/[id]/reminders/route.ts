import { body, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { reminderSchema, setReminders } from "@/server/events/service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { daysBefore } = await body(req, reminderSchema);
  return json({ reminders: await setReminders(user.id, (await params).id, daysBefore) });
});
