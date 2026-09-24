import { describe, expect, it } from "vitest";
import { addDays, brToKey, diffDays, isValidKey, rel, todayKey } from "@/lib/dates";
import { defaultReminders, reminderText } from "@/server/notifications/service";

describe("datas em America/Sao_Paulo (§47)", () => {
  it("o dia de hoje segue o fuso de São Paulo, não o UTC", () => {
    // 23/09 às 23:30 em São Paulo = 24/09 02:30 UTC
    expect(todayKey(new Date("2026-09-24T02:30:00Z"))).toBe("2026-09-23");
    expect(todayKey(new Date("2026-09-24T03:00:00Z"))).toBe("2026-09-24");
  });

  it("aritmética de dias e textos relativos", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(diffDays("2026-10-08", "2026-09-23")).toBe(15);
    expect([rel(0), rel(1), rel(-1), rel(15), rel(-3)]).toEqual(["Hoje", "Amanhã", "Ontem", "Em 15 dias", "Há 3 dias"]);
    expect(isValidKey("2026-02-29")).toBe(false);
    expect(brToKey("08/10/2026")).toBe("2026-10-08");
  });
});

describe("lembretes (§25, §26)", () => {
  it("passeio: 7, 3 e 1 dia antes; tarefa: 1 dia antes; nunca no passado", () => {
    expect(defaultReminders("passeio", "2026-10-08", "2026-09-23").map((r) => r.reminderDate)).toEqual(["2026-10-01", "2026-10-05", "2026-10-07"]);
    expect(defaultReminders("tarefa", "2026-09-25", "2026-09-23").map((r) => r.reminderType)).toEqual(["1d"]);
    expect(defaultReminders("passeio", "2026-09-25", "2026-09-23").map((r) => r.reminderType)).toEqual(["1d"]);
  });

  it("texto do lembrete da véspera", () => {
    const t = reminderText(
      { title: "Passeio ao zoológico", eventType: "passeio", startDate: "2026-10-08", amount: 35, authorizationRequired: true, materials: [{ description: "Autorização assinada" }] },
      "2026-10-07",
    );
    expect(t.title).toBe("🔔 Amanhã: 🚌 Passeio ao zoológico");
    expect(t.message).toBe("Não esquecer: Autorização assinada; R$ 35,00.");
  });
});
