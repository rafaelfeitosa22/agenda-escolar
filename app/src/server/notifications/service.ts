// Notificações dentro do app (§25). O canal é só "in-app" por enquanto; push, e-mail e
// WhatsApp podem ser novos entregadores que consomem a mesma tabela.
import { prisma } from "@/server/db";
import { addDays, diffDays, rel, todayKey } from "@/lib/dates";
import { category, isAuthorizationItem, money } from "@/lib/domain";

type NotifyInput = { userId: string; type: string; title: string; message: string; eventId?: string; dedupeKey?: string };

export async function notify(n: NotifyInput) {
  if (n.dedupeKey) {
    const exists = await prisma.notification.findUnique({ where: { dedupeKey: n.dedupeKey } });
    if (exists) return exists;
  }
  return prisma.notification.create({ data: n });
}

/** Lembretes padrão (§26): tarefas e provas 1 dia antes; demais eventos 7, 3 e 1 dia antes. */
export function defaultReminders(eventType: string, startDate: string, today = todayKey()) {
  const offsets = eventType === "tarefa" || eventType === "prova" ? [1] : [7, 3, 1];
  return offsets
    .map((d) => ({ reminderType: `${d}d`, reminderDate: addDays(startDate, -d) }))
    .filter((r) => r.reminderDate >= today);
}

export function reminderText(e: { title: string; eventType: string; startDate: string; amount: unknown; authorizationRequired: boolean; materials: { description: string }[] }, today: string) {
  const n = diffDays(e.startDate, today);
  const when = n === 0 ? "Hoje" : n === 1 ? "Amanhã" : rel(n);
  const remember = [
    ...e.materials.map((m) => m.description),
    e.authorizationRequired && !e.materials.some((m) => isAuthorizationItem(m.description)) ? "Autorização" : null,
    e.amount != null ? money(Number(e.amount)) : null,
  ].filter(Boolean);
  return {
    title: `🔔 ${when}: ${category(e.eventType).emoji} ${e.title}`,
    message: remember.length ? `Não esquecer: ${remember.join("; ")}.` : "Confira os detalhes na agenda.",
  };
}

/** Gera, de forma idempotente, as notificações de lembretes vencidos para o usuário. */
export async function syncReminderNotifications(userId: string, today = todayKey()) {
  const classIds = (await prisma.classMember.findMany({ where: { userId, status: "ativo" }, select: { classId: true } })).map((m) => m.classId);
  if (!classIds.length) return;
  const due = await prisma.eventReminder.findMany({
    where: {
      status: "pendente",
      reminderDate: { lte: today },
      event: { classId: { in: classIds }, deletedAt: null, status: "ativo", startDate: { gte: today } },
    },
    include: { event: { include: { materials: { orderBy: { position: "asc" } } } } },
    orderBy: { reminderDate: "desc" },
  });
  const seen = new Set<string>();
  for (const r of due) {
    if (seen.has(r.eventId)) continue; // só o lembrete mais recente de cada evento
    seen.add(r.eventId);
    const t = reminderText(r.event, today);
    await notify({ userId, type: "lembrete", eventId: r.eventId, ...t, dedupeKey: `lembrete:${r.id}:${userId}` });
  }
}

export async function listNotifications(userId: string) {
  await syncReminderNotifications(userId);
  return prisma.notification.findMany({
    where: { userId, OR: [{ eventId: null }, { event: { deletedAt: null } }] },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { event: { select: { classId: true } } },
  });
}

export async function markRead(userId: string, id: string) {
  const r = await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  return r.count;
}

export async function unreadCount(userId: string) {
  await syncReminderNotifications(userId);
  return prisma.notification.count({ where: { userId, readAt: null } });
}
