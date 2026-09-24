import { describe, expect, it } from "vitest";
import { findDuplicates, titleSimilarity } from "@/server/events/duplicates";
import { createEvent, updateEvent } from "@/server/events/service";
import { ApiError } from "@/server/http";
import { addDays, todayKey } from "@/lib/dates";
import { baseEvent, future, scenario } from "./helpers";

describe("similaridade de títulos", () => {
  it.each([
    ["Passeio ao Zoológico", "Passeio no Zoológico"],
    ["Passeio ao Zoológico", "Passeio Zoológico"],
    ["Passeio ao Zoológico", "passeio ao zoologico"],
    ["Passeio ao Zoológico", "Paseio ao Zologico"],
    ["Reunião de pais", "Reuniao dos pais"],
  ])("%s ≈ %s", (a, b) => {
    expect(titleSimilarity(a, b)).toBeGreaterThanOrEqual(0.6);
  });

  it.each([
    ["Passeio ao Zoológico", "Feira Cultural"],
    ["Prova de Matemática", "Tarefa de Português"],
    ["Aniversário da Maria", "Reunião de pais"],
  ])("%s ≠ %s", (a, b) => {
    expect(titleSimilarity(a, b)).toBeLessThan(0.6);
  });

  it("horário diferente, quando os dois informam, não é duplicado", () => {
    const d = [{ id: "1", title: "Reunião de pais", startDate: "2026-09-29", startTime: "19:00" }];
    expect(findDuplicates({ title: "Reunião de pais", startTime: "08:00" }, d)).toHaveLength(0);
    expect(findDuplicates({ title: "Reunião de pais", startTime: null }, d)).toHaveLength(1);
    expect(findDuplicates({ title: "Reunião dos pais", startTime: "19:00" }, d)).toHaveLength(1);
  });
});

async function code(p: Promise<unknown>) {
  try {
    await p;
    return "ok";
  } catch (e) {
    if (e instanceof ApiError) return e.code;
    throw e;
  }
}

describe("regra de não duplicar eventos (§15)", () => {
  it("avisa possível duplicado na mesma turma e data, e permite cadastrar mesmo assim", async () => {
    const s = await scenario();
    const first = await createEvent(s.member.id, s.cls.id, baseEvent({ startTime: null }));
    let err: ApiError | null = null;
    try {
      await createEvent(s.member2.id, s.cls.id, baseEvent({ title: "Passeio no Zoológico", startTime: null }));
    } catch (e) {
      err = e as ApiError;
    }
    expect(err?.status).toBe(409);
    expect(err?.code).toBe("possivel_duplicado");
    expect(err?.message).toBe("⚠️ Parece que este evento já foi cadastrado.");
    expect((err?.extra?.duplicates as { id: string }[])[0].id).toBe(first.id);

    // Nunca bloqueia em definitivo: com a confirmação do usuário, cadastra.
    expect(await code(createEvent(s.member2.id, s.cls.id, baseEvent({ title: "Passeio no Zoológico", startTime: null, force: true })))).toBe("ok");
  });

  it("não acusa duplicado em outra data, outra turma ou evento excluído/cancelado", async () => {
    const s = await scenario();
    await createEvent(s.member.id, s.cls.id, baseEvent());
    expect(await code(createEvent(s.member.id, s.cls.id, baseEvent({ startDate: addDays(future(), 1) })))).toBe("ok");
    expect(await code(createEvent(s.outsider.id, s.other.id, baseEvent()))).toBe("ok");

    const c = await createEvent(s.member.id, s.cls.id, baseEvent({ title: "Festa das Crianças", startDate: future(20) }));
    await updateEvent(s.member.id, c.id, { status: "cancelado", force: false, confirmPast: false });
    expect(await code(createEvent(s.member.id, s.cls.id, baseEvent({ title: "Festa das crianças", startDate: future(20) })))).toBe("ok");
  });

  it("evento no passado pede confirmação, mas não é proibido (§46)", async () => {
    const s = await scenario();
    const past = addDays(todayKey(), -3);
    expect(await code(createEvent(s.member.id, s.cls.id, baseEvent({ startDate: past })))).toBe("evento_passado");
    expect(await code(createEvent(s.member.id, s.cls.id, baseEvent({ startDate: past, confirmPast: true })))).toBe("ok");
  });

  it("editar para um título que colide também avisa, ignorando o próprio evento", async () => {
    const s = await scenario();
    await createEvent(s.member.id, s.cls.id, baseEvent({ title: "Feira Cultural", startTime: null }));
    const other = await createEvent(s.member.id, s.cls.id, baseEvent({ title: "Prova de Matemática", startTime: null }));
    expect(await code(updateEvent(s.member.id, other.id, { title: "Prova de Matemática", description: "Nova descrição", force: false, confirmPast: false }))).toBe("ok");
    expect(await code(updateEvent(s.member.id, other.id, { title: "Feira cultural", force: false, confirmPast: false }))).toBe("possivel_duplicado");
  });
});
