import { json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { listNotifications } from "@/server/notifications/service";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ notifications: await listNotifications(user.id) });
});
