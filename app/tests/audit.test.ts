import { describe, expect, it } from "vitest";
import { createEvent, deleteEvent, getEvent, updateEvent } from "@/server/events/service";
import { describeChange } from "@/server/events/audit";
import { prisma } from "@/server/db";
import { baseEvent, scenario } from "./helpers";

const history = (eventId: string) => prisma.eventHistory.findMany({ where: { eventId }, orderBy: { createdAt: "asc" } });

describe("auditoria de eventos (§22, §24)", () => {
  it("registra criação, alteração campo a campo e exclusão com o usuário responsável", async () => {
    const s = await scenario();
    const ev = await createEvent(s.member.id, s.cls.id, baseEvent());
    await updateEvent(s.admin.id, ev.id, { startTime: "07:30", location: "Zoo de Brasília", force: false, confirmPast: false });
    await deleteEvent(s.admin.id, ev.id);

    const h = await history(ev.id);
    expect(h.map((x) => x.action)).toEqual(["criado", "alterado", "excluido"]);
    expect(h[0].userId).toBe(s.member.id);
    expect(JSON.parse(h[0].newData!).title).toBe("Passeio ao Zoológico");

    expect(h[1].userId).toBe(s.admin.id);
    expect(JSON.parse(h[1].oldData!)).toEqual({ startTime: "08:00", location: "Zoológico" });
    expect(JSON.parse(h[1].newData!)).toEqual({ startTime: "07:30", location: "Zoo de Brasília" });

    expect(h[2].userId).toBe(s.admin.id);
    expect(JSON.parse(h[2].oldData!).title).toBe("Passeio ao Zoológico");
  });

  it("edição sem mudança real não gera registro", async () => {
    const s = await scenario();
    const ev = await createEvent(s.member.id, s.cls.id, baseEvent());
    await updateEvent(s.member.id, ev.id, { title: "Passeio ao Zoológico", amount: 35, force: false, confirmPast: false });
    expect((await history(ev.id)).length).toBe(1);
  });

  it("materiais e status entram no histórico", async () => {
    const s = await scenario();
    const ev = await createEvent(s.member.id, s.cls.id, baseEvent());
    await updateEvent(s.member.id, ev.id, { materials: ["Autorização assinada", "Boné"], force: false, confirmPast: false });
    await updateEvent(s.member.id, ev.id, { status: "cancelado", force: false, confirmPast: false });
    const h = await history(ev.id);
    expect(JSON.parse(h[1].newData!).materials).toEqual(["Autorização assinada", "Boné"]);
    expect(JSON.parse(h[2].newData!)).toEqual({ status: "cancelado" });
  });

  it("o detalhe mostra a última alteração no formato da especificação", async () => {
    const s = await scenario();
    const ev = await createEvent(s.member.id, s.cls.id, baseEvent());
    await updateEvent(s.admin.id, ev.id, { startTime: "09:00", force: false, confirmPast: false });
    const d = await getEvent(s.member.id, ev.id);
    expect(d.lastChange).toMatch(/^Admin alterou o horário em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}\.$/);
  });

  it("frases do histórico", () => {
    const at = new Date("2026-09-23T22:32:00Z"); // 19:32 em São Paulo
    expect(describeChange("Maria Oliveira", '{"startTime":"07:30"}', '{"startTime":"08:00"}', at)).toBe("Maria alterou o horário em 23/09/2026 às 19:32.");
    expect(describeChange("Carla", '{"status":"ativo"}', '{"status":"cancelado"}', at)).toBe("Carla cancelou o evento em 23/09/2026 às 19:32.");
    expect(describeChange("Ana", '{"startTime":"1","location":"2"}', '{"startTime":"3","location":"4"}', at)).toBe("Ana alterou o horário e o local em 23/09/2026 às 19:32.");
  });
});
