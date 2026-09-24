import { notFound } from "next/navigation";
import { EventDetailView } from "@/components/event-detail";
import { getEvent } from "@/server/events/service";
import { orNotFound, pageClass } from "@/server/page";

export default async function EventPage({ params }: { params: Promise<{ classId: string; eventId: string }> }) {
  const { classId, eventId } = await params;
  const { user } = await pageClass(classId);
  const event = await orNotFound(getEvent(user.id, eventId));
  if (event.classId !== classId) notFound();
  return <EventDetailView event={event} />;
}
