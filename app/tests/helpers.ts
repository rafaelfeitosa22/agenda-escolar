import { prisma } from "@/server/db";
import { addDays, todayKey } from "@/lib/dates";

let n = 0;

export async function user(name = "Pessoa") {
  n++;
  return prisma.user.create({ data: { name: `${name} ${n}`, email: `u${n}-${Date.now()}@teste.dev`, passwordHash: "x" } });
}

/** Turma com admin, membro, visualizador, pendente e alguém de outra turma. */
export async function scenario() {
  const [admin, member, member2, viewer, pending, outsider] = await Promise.all([user("Admin"), user("Membro"), user("Membro2"), user("Visual"), user("Pendente"), user("Fora")]);
  const school = await prisma.school.create({ data: { name: "Escola Teste" } });
  const cls = await prisma.class.create({ data: { schoolId: school.id, name: "Turma A", year: 2026, inviteCode: `A-${Date.now()}-${n}` } });
  const other = await prisma.class.create({ data: { schoolId: school.id, name: "Turma B", year: 2026, inviteCode: `B-${Date.now()}-${n}` } });
  const add = (classId: string, userId: string, role: string, status = "ativo") => prisma.classMember.create({ data: { classId, userId, role, status } });
  await add(cls.id, admin.id, "ADMIN");
  await add(cls.id, member.id, "MEMBRO");
  await add(cls.id, member2.id, "MEMBRO");
  await add(cls.id, viewer.id, "VISUALIZADOR");
  await add(cls.id, pending.id, "MEMBRO", "pendente");
  await add(other.id, outsider.id, "ADMIN");
  return { admin, member, member2, viewer, pending, outsider, cls, other };
}

export const future = (days = 10) => addDays(todayKey(), days);

export const baseEvent = (over: Record<string, unknown> = {}) => ({
  title: "Passeio ao Zoológico",
  description: "Passeio ao zoológico.",
  eventType: "passeio" as const,
  startDate: future(),
  endDate: null,
  startTime: "08:00",
  endTime: null,
  location: "Zoológico",
  amount: 35,
  authorizationRequired: true,
  materials: ["Autorização assinada"],
  notes: null,
  link: null,
  responsible: null,
  force: false,
  confirmPast: false,
  uploadId: null,
  ...over,
});
