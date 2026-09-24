import { notFound } from "next/navigation";
import { NewEventForm } from "@/components/event-editor";
import { pageClass } from "@/server/page";
import { isValidKey } from "@/lib/dates";

export default async function NewEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ data?: string; foto?: string }>;
}) {
  const { cls } = await pageClass((await params).classId);
  if (cls.role === "VISUALIZADOR") notFound();
  const sp = await searchParams;
  return <NewEventForm initialDate={sp.data && isValidKey(sp.data) ? sp.data : undefined} uploadId={sp.foto && /^[a-z0-9]{10,40}$/.test(sp.foto) ? sp.foto : undefined} />;
}
