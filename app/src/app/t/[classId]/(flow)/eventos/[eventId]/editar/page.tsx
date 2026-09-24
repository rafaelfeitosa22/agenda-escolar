import { notFound } from "next/navigation";
import { EditEventForm } from "@/components/event-editor";
import { getEvent } from "@/server/events/service";
import { orNotFound, pageClass } from "@/server/page";

export default async function EditEventPage({ params }: { params: Promise<{ classId: string; eventId: string }> }) {
  const { classId, eventId } = await params;
  const { user } = await pageClass(classId);
  const event = await orNotFound(getEvent(user.id, eventId));
  if (event.classId !== classId || !event.can.edit) notFound();
  return <EditEventForm event={event} />;
}
