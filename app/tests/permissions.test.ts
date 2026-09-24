import { describe, expect, it } from "vitest";
import { can, canOnEvent } from "@/server/permissions";
import { createEvent, deleteEvent, getEvent, listEvents, updateEvent } from "@/server/events/service";
import { canCreateClass, createClass, joinClass, leaveClass, listMembers, updateMember } from "@/server/classes/service";
import { ApiError } from "@/server/http";
import { prisma } from "@/server/db";
import { baseEvent, scenario } from "./helpers";

async function status(p: Promise<unknown>) {
  try {
    await p;
    return 200;
  } catch (e) {
    if (e instanceof ApiError) return e.status;
    throw e;
  }
}

describe("matriz de permissões", () => {
  it("segue a especificação §6", () => {
    expect(can("ADMIN", "class.manageMembers")).toBe(true);
    expect(can("MEMBRO", "class.manageMembers")).toBe(false);
    expect(can("MEMBRO", "event.create")).toBe(true);
    expect(can("MEMBRO", "ai.read")).toBe(true);
    expect(can("VISUALIZADOR", "event.view")).toBe(true);
    expect(can("VISUALIZADOR", "event.create")).toBe(false);
    expect(can("VISUALIZADOR", "ai.read")).toBe(false);
    expect(can("DESCONHECIDO", "event.view")).toBe(false);
    expect(canOnEvent("MEMBRO", "edit", true)).toBe(true);
    expect(canOnEvent("MEMBRO", "edit", false)).toBe(false);
    expect(canOnEvent("MEMBRO", "delete", false)).toBe(false);
    expect(canOnEvent("ADMIN", "delete", false)).toBe(true);
    expect(canOnEvent("VISUALIZADOR", "edit", true)).toBe(false);
  });
});

describe("isolamento e permissões por turma (backend)", () => {
  it("quem não participa da turma não vê nem cria eventos, nem abre por id", async () => {
    const s = await scenario();
    const ev = await createEvent(s.member.id, s.cls.id, baseEvent());
    expect(await status(listEvents(s.outsider.id, s.cls.id))).toBe(404);
    expect(await status(getEvent(s.outsider.id, ev.id))).toBe(404);
    expect(await status(createEvent(s.outsider.id, s.cls.id, baseEvent({ title: "Invasão" })))).toBe(404);
    expect(await status(updateEvent(s.outsider.id, ev.id, { title: "x", force: false, confirmPast: false }))).toBe(404);
    expect(await status(deleteEvent(s.outsider.id, ev.id))).toBe(404);
  });

  it("pedido pendente ainda não dá acesso à agenda", async () => {
    const s = await scenario();
    expect(await status(listEvents(s.pending.id, s.cls.id))).toBe(404);
  });

  it("visualizador só visualiza", async () => {
    const s = await scenario();
    const ev = await createEvent(s.admin.id, s.cls.id, baseEvent());
    expect((await listEvents(s.viewer.id, s.cls.id)).length).toBe(1);
    expect(await status(createEvent(s.viewer.id, s.cls.id, baseEvent({ title: "Outro" })))).toBe(403);
    expect(await status(updateEvent(s.viewer.id, ev.id, { title: "x", force: false, confirmPast: false }))).toBe(403);
    expect(await status(deleteEvent(s.viewer.id, ev.id))).toBe(403);
  });

  it("membro edita e exclui só os próprios eventos; admin corrige qualquer um", async () => {
    const s = await scenario();
    const mine = await createEvent(s.member.id, s.cls.id, baseEvent());
    const theirs = await createEvent(s.member2.id, s.cls.id, baseEvent({ title: "Feira Cultural" }));
    expect(await status(updateEvent(s.member.id, mine.id, { location: "Zoo de Brasília", force: false, confirmPast: false }))).toBe(200);
    expect(await status(updateEvent(s.member.id, theirs.id, { location: "x", force: false, confirmPast: false }))).toBe(403);
    expect(await status(deleteEvent(s.member.id, theirs.id))).toBe(403);
    expect(await status(updateEvent(s.admin.id, theirs.id, { location: "Quadra", force: false, confirmPast: false }))).toBe(200);
    expect(await status(deleteEvent(s.admin.id, theirs.id))).toBe(200);
    const detail = await getEvent(s.member.id, mine.id);
    expect(detail.can).toEqual({ edit: true, delete: true });
  });

  it("exclusão é lógica: some da agenda mas continua no banco", async () => {
    const s = await scenario();
    const ev = await createEvent(s.member.id, s.cls.id, baseEvent());
    await deleteEvent(s.member.id, ev.id);
    expect(await listEvents(s.admin.id, s.cls.id)).toHaveLength(0);
    expect(await status(getEvent(s.admin.id, ev.id))).toBe(404);
    const row = await prisma.event.findUnique({ where: { id: ev.id } });
    expect(row?.deletedAt).not.toBeNull();
    expect(row?.deletedBy).toBe(s.member.id);
  });

  it("entrada por código fica pendente até o admin aprovar; só admin aprova", async () => {
    const s = await scenario();
    const newbie = await prisma.user.create({ data: { name: "Nova Mãe", email: `nova-${Date.now()}@teste.dev`, passwordHash: "x" } });
    const r = await joinClass(newbie.id, s.cls.inviteCode.toLowerCase());
    expect(r.status).toBe("pendente");
    expect(await status(listEvents(newbie.id, s.cls.id))).toBe(404);

    const pendingRow = (await listMembers(s.admin.id, s.cls.id)).find((m) => m.userId === newbie.id)!;
    expect(await status(updateMember(s.member.id, s.cls.id, pendingRow.id, { action: "aprovar" }))).toBe(403);
    await updateMember(s.admin.id, s.cls.id, pendingRow.id, { action: "aprovar" });
    expect(await listEvents(newbie.id, s.cls.id)).toEqual([]);

    const notif = await prisma.notification.findFirst({ where: { userId: s.admin.id, type: "membro_pendente" } });
    expect(notif?.message).toContain("Nova Mãe");
  });

  it("membros não veem e-mails dos outros; admin vê", async () => {
    const s = await scenario();
    expect((await listMembers(s.member.id, s.cls.id)).every((m) => m.email === undefined)).toBe(true);
    expect((await listMembers(s.admin.id, s.cls.id)).every((m) => typeof m.email === "string")).toBe(true);
  });

  it("usuário consegue sair da turma, mas o último admin não abandona a turma", async () => {
    const s = await scenario();
    await leaveClass(s.member.id, s.cls.id);
    expect(await status(listEvents(s.member.id, s.cls.id))).toBe(404);
    expect(await status(leaveClass(s.admin.id, s.cls.id))).toBe(409);
  });

  it("só os e-mails em CLASS_CREATOR_EMAILS criam turmas", async () => {
    const s = await scenario();
    const allowed = await prisma.user.findUniqueOrThrow({ where: { id: s.admin.id } });
    process.env.CLASS_CREATOR_EMAILS = ` outra@escola.dev , ${allowed.email.toUpperCase()} `;
    try {
      const input = { name: "Turma Nova", schoolName: "Escola Teste", year: 2026 };
      expect(await status(createClass(s.member.id, input))).toBe(403);
      expect(await status(createClass(s.admin.id, input))).toBe(200);
      expect(canCreateClass("OUTRA@escola.dev")).toBe(true);
      expect(canCreateClass("qualquer@familia.dev")).toBe(false);
    } finally {
      delete process.env.CLASS_CREATOR_EMAILS;
    }
  });

  it("código inválido não revela turmas", async () => {
    const s = await scenario();
    expect(await status(joinClass(s.outsider.id, "NAO-EXISTE"))).toBe(404);
  });
});
