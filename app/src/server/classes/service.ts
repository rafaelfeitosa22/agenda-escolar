import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/server/db";
import { ApiError, notFound } from "@/server/http";
import { ROLES, normalize } from "@/lib/domain";
import { requireMember } from "./access";
import { notify } from "@/server/notifications/service";

export const createClassSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da turma.").max(80),
  schoolName: z.string().trim().min(2, "Informe o nome da escola.").max(120),
  year: z.number().int().min(2000).max(2100),
  emoji: z.string().trim().max(8).optional(),
});

export const updateClassSchema = createClassSchema.partial();

export const joinSchema = z.object({ code: z.string().trim().min(3, "Informe o código da turma.").max(40) });

export const memberUpdateSchema = z.object({
  action: z.enum(["aprovar", "recusar", "remover", "alterar_papel"]),
  role: z.enum(ROLES).optional(),
});

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newInviteCode(name: string) {
  const prefix = normalize(name).replace(/[^a-z]/g, "").slice(0, 6).toUpperCase() || "TURMA";
  const suffix = Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${prefix}-${suffix}`;
}

export async function listClasses(userId: string) {
  const rows = await prisma.classMember.findMany({
    where: { userId, status: { in: ["ativo", "pendente"] } },
    include: { class: { include: { school: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return rows.map((m) => ({
    id: m.class.id,
    name: m.class.name,
    emoji: m.class.emoji,
    year: m.class.year,
    school: m.class.school.name,
    role: m.role,
    status: m.status,
  }));
}

/**
 * Quem pode criar turmas: só os e-mails em CLASS_CREATOR_EMAILS (separados por vírgula).
 * As famílias entram pelo código de convite. Sem a variável, ninguém cria em produção;
 * em desenvolvimento e nos testes, qualquer conta pode criar.
 */
export function canCreateClass(email: string) {
  const list = (process.env.CLASS_CREATOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return process.env.NODE_ENV !== "production";
  return list.includes(email.trim().toLowerCase());
}

export async function createClass(userId: string, input: z.infer<typeof createClassSchema>) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  if (!canCreateClass(user.email)) throw new ApiError(403, "sem_permissao", "Só a administração da escola pode criar turmas. Peça o código de convite da sua turma.");
  return prisma.$transaction(async (tx) => {
    const school =
      (await tx.school.findFirst({ where: { name: input.schoolName } })) ??
      (await tx.school.create({ data: { name: input.schoolName } }));
    const cls = await tx.class.create({
      data: { name: input.name, year: input.year, emoji: input.emoji || "🌻", schoolId: school.id, inviteCode: newInviteCode(input.name) },
    });
    await tx.classMember.create({ data: { classId: cls.id, userId, role: "ADMIN", status: "ativo" } });
    return cls;
  });
}

export async function getClass(userId: string, classId: string) {
  const m = await requireMember(userId, classId);
  const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId }, include: { school: true } });
  return {
    id: cls.id,
    name: cls.name,
    emoji: cls.emoji,
    year: cls.year,
    school: cls.school.name,
    // O código de convite só é exibido para quem administra a turma.
    inviteCode: m.role === "ADMIN" ? cls.inviteCode : undefined,
    role: m.role,
  };
}

export async function updateClass(userId: string, classId: string, input: z.infer<typeof updateClassSchema>) {
  await requireMember(userId, classId, "class.edit");
  const data: Record<string, unknown> = {};
  if (input.name) data.name = input.name;
  if (input.year) data.year = input.year;
  if (input.emoji) data.emoji = input.emoji;
  if (input.schoolName) {
    const school =
      (await prisma.school.findFirst({ where: { name: input.schoolName } })) ??
      (await prisma.school.create({ data: { name: input.schoolName } }));
    data.schoolId = school.id;
  }
  await prisma.class.update({ where: { id: classId }, data });
  return getClass(userId, classId);
}

export async function regenerateInviteCode(userId: string, classId: string) {
  await requireMember(userId, classId, "class.manageMembers");
  const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId } });
  const updated = await prisma.class.update({ where: { id: classId }, data: { inviteCode: newInviteCode(cls.name) } });
  return updated.inviteCode;
}

/** Pedido de entrada pelo código de convite. Fica pendente até um administrador aprovar. */
export async function joinClass(userId: string, code: string) {
  const cls = await prisma.class.findFirst({ where: { inviteCode: code.trim().toUpperCase(), status: "ativa" } });
  if (!cls) throw new ApiError(404, "codigo_invalido", "Código não encontrado. Confira com quem administra a turma.");

  const existing = await prisma.classMember.findUnique({ where: { classId_userId: { classId: cls.id, userId } } });
  if (existing?.status === "ativo") return { classId: cls.id, status: "ativo" as const, className: cls.name };
  if (existing?.status === "pendente") return { classId: cls.id, status: "pendente" as const, className: cls.name };

  const member = existing
    ? await prisma.classMember.update({ where: { id: existing.id }, data: { status: "pendente", role: "MEMBRO", joinedAt: new Date() } })
    : await prisma.classMember.create({ data: { classId: cls.id, userId, role: "MEMBRO", status: "pendente" } });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const admins = await prisma.classMember.findMany({ where: { classId: cls.id, role: "ADMIN", status: "ativo" } });
  await Promise.all(
    admins.map((a) =>
      notify({
        userId: a.userId,
        type: "membro_pendente",
        title: "👋 Novo pedido de entrada",
        message: `${user.name} quer entrar na turma ${cls.name}.`,
        dedupeKey: `pendente:${member.id}:${member.joinedAt.getTime()}:${a.userId}`,
      }),
    ),
  );
  return { classId: cls.id, status: "pendente" as const, className: cls.name };
}

export async function listMembers(userId: string, classId: string) {
  const me = await requireMember(userId, classId);
  const isAdmin = me.role === "ADMIN";
  const rows = await prisma.classMember.findMany({
    where: { classId, status: isAdmin ? { in: ["ativo", "pendente"] } : "ativo" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ status: "desc" }, { joinedAt: "asc" }],
  });
  return rows.map((m) => ({
    id: m.id,
    userId: m.user.id,
    name: m.user.name,
    // E-mails de outros pais só ficam visíveis para o administrador.
    email: isAdmin ? m.user.email : undefined,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt,
  }));
}

async function activeAdminCount(classId: string) {
  return prisma.classMember.count({ where: { classId, role: "ADMIN", status: "ativo" } });
}

export async function updateMember(userId: string, classId: string, memberId: string, input: z.infer<typeof memberUpdateSchema>) {
  await requireMember(userId, classId, "class.manageMembers");
  const target = await prisma.classMember.findFirst({ where: { id: memberId, classId }, include: { class: true } });
  if (!target) throw notFound("Pessoa não encontrada nesta turma.");

  const demotingLastAdmin =
    target.role === "ADMIN" && target.status === "ativo" && (await activeAdminCount(classId)) <= 1 &&
    (input.action === "remover" || (input.action === "alterar_papel" && input.role !== "ADMIN"));
  if (demotingLastAdmin) throw new ApiError(409, "ultimo_admin", "A turma precisa de pelo menos um administrador.");

  switch (input.action) {
    case "aprovar": {
      if (target.status !== "pendente") throw new ApiError(409, "nao_pendente", "Este pedido já foi tratado.");
      await prisma.classMember.update({ where: { id: memberId }, data: { status: "ativo", role: input.role ?? target.role } });
      await notify({
        userId: target.userId,
        type: "membro_aprovado",
        title: "✅ Entrada aprovada",
        message: `Você já pode ver a agenda da turma ${target.class.name}.`,
        dedupeKey: `aprovado:${memberId}:${Date.now()}`,
      });
      break;
    }
    case "recusar":
      if (target.status !== "pendente") throw new ApiError(409, "nao_pendente", "Este pedido já foi tratado.");
      await prisma.classMember.update({ where: { id: memberId }, data: { status: "recusado" } });
      break;
    case "remover":
      if (target.userId === userId) throw new ApiError(409, "use_sair", "Para sair da turma, use a opção Sair da turma no perfil.");
      await prisma.classMember.update({ where: { id: memberId }, data: { status: "removido" } });
      break;
    case "alterar_papel":
      if (!input.role) throw new ApiError(400, "dados_invalidos", "Informe o novo papel.");
      await prisma.classMember.update({ where: { id: memberId }, data: { role: input.role } });
      break;
  }
  return { ok: true };
}

export async function leaveClass(userId: string, classId: string) {
  const m = await prisma.classMember.findUnique({ where: { classId_userId: { classId, userId } } });
  if (!m || !["ativo", "pendente"].includes(m.status)) throw notFound("Turma não encontrada.");
  if (m.role === "ADMIN" && m.status === "ativo" && (await activeAdminCount(classId)) <= 1) {
    const others = await prisma.classMember.count({ where: { classId, status: "ativo", NOT: { userId } } });
    if (others > 0) throw new ApiError(409, "ultimo_admin", "Antes de sair, torne outra pessoa administradora da turma.");
  }
  await prisma.classMember.update({ where: { id: m.id }, data: { status: "saiu" } });
  return { ok: true };
}

