import { prisma } from "@/server/db";
import { forbidden, notFound } from "@/server/http";
import { can, type Action } from "@/server/permissions";

/** Vínculo ativo do usuário com a turma, ou erro. Quem não participa recebe 404. */
export async function requireMember(userId: string, classId: string, action: Action = "class.view") {
  const m = await prisma.classMember.findUnique({ where: { classId_userId: { classId, userId } } });
  if (!m || m.status !== "ativo") throw notFound("Turma não encontrada.");
  if (!can(m.role, action)) throw forbidden();
  return m;
}

export async function activeMembership(userId: string, classId: string) {
  const m = await prisma.classMember.findUnique({ where: { classId_userId: { classId, userId } } });
  return m && m.status === "ativo" ? m : null;
}
