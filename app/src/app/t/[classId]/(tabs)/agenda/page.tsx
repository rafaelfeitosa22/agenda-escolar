import { pageClass } from "@/server/page";
import { listEvents } from "@/server/events/service";
import { AgendaView } from "@/components/agenda-view";

export default async function AgendaPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { user } = await pageClass(classId);
  const events = await listEvents(user.id, classId);
  return <AgendaView events={events} />;
}
