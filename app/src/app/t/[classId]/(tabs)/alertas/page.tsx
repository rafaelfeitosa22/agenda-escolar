import { AlertsList } from "@/components/alerts-list";
import { pageClass } from "@/server/page";
import { listNotifications } from "@/server/notifications/service";

export default async function AlertasPage({ params }: { params: Promise<{ classId: string }> }) {
  const { user } = await pageClass((await params).classId);
  const rows = await listNotifications(user.id);
  return (
    <div className="flex flex-col">
      <h1 className="px-5 pt-5 pb-3 text-[30px] font-extrabold tracking-[-0.015em]">Alertas</h1>
      <AlertsList
        items={rows.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          read: !!n.readAt,
          createdAt: n.createdAt.toISOString(),
          href: n.event ? `/t/${n.event.classId}/eventos/${n.eventId}` : n.type === "membro_pendente" ? "membros" : null,
        }))}
      />
    </div>
  );
}
