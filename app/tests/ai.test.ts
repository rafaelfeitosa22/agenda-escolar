import { describe, expect, it, afterEach } from "vitest";
import { mockResult, MockAgendaAI } from "@/server/ai/mock";
import { readAgenda, toDrafts } from "@/server/ai/read-agenda";
import { setAgendaAI } from "@/server/ai";
import { rawResultSchema, type RawEvent } from "@/server/ai/types";
import { ApiError } from "@/server/http";
import { prisma } from "@/server/db";
import { scenario } from "./helpers";

// JPEG mínimo válido (assinatura FF D8 FF) para passar a validação de tipo.
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);

const conf = { titulo: 90, data: 90, horario: 0, tipo: 90, local: 0, valor: 0, materiais: 0, descricao: 90, observacoes: 0 };

afterEach(() => setAgendaAI(null));

describe("extração mock da IA (§17–§20, §44)", () => {
  it("devolve JSON estruturado que passa no schema", () => {
    for (const s of ["multi", "single", "relativa", "vazio", "erro"]) {
      expect(() => rawResultSchema.parse(mockResult(s, "2026-09-23"))).not.toThrow();
    }
  });

  it("exemplo do §17: passeio ao zoológico vira prévia com os campos da foto", () => {
    const [d] = toDrafts(mockResult("single", "2026-09-23"));
    expect(d).toMatchObject({
      title: "Passeio ao Zoológico",
      startDate: "2026-10-08",
      startTime: "08:00",
      eventType: "passeio",
      amount: 35,
      materials: ["Autorização assinada"],
      authorizationRequired: true,
      notes: "Saída às 8h",
    });
    // Local com 72% de confiança deve ser destacado para revisão (§20).
    expect(d.lowConfidence).toContain("location");
    expect(d.lowConfidence).not.toContain("amount");
    expect(d.missingRequired).toEqual([]);
  });

  it("data relativa é calculada pela data da foto e exige confirmação (§18)", () => {
    const [d] = toDrafts(mockResult("relativa", "2026-09-23"));
    expect(d.relativeDate).toEqual({ text: "próxima quarta-feira", interpreted: "2026-09-30" });
  });

  it("encontra vários eventos numa mesma foto (§44)", () => {
    const drafts = toDrafts(mockResult("multi", "2026-09-23"));
    expect(drafts.map((d) => d.title)).toEqual(["Passeio ao Zoológico", "Feira Cultural", "Prova de Matemática", "Atividade de pintura"]);
  });

  it("nunca inventa: campos ausentes ou inválidos ficam vazios (§19, §43)", () => {
    const raw: RawEvent = {
      titulo: "Feira Cultural", data: "2026-02-31", data_texto_original: null, data_relativa: false, horario: "de manhã",
      tipo: "Evento escolar", local: "  ", valor: -5, materiais: [" ", "Cartolina"], autorizacao_necessaria: null,
      descricao: null, observacoes: null, confianca: conf,
    };
    const [d] = toDrafts({ legivel: true, texto_lido: "", eventos: [raw] });
    expect(d.startDate).toBeNull(); // 31/02 não existe
    expect(d.startTime).toBeNull(); // "de manhã" não é horário
    expect(d.location).toBeNull();
    expect(d.amount).toBeNull();
    expect(d.materials).toEqual(["Cartolina"]);
    expect(d.authorizationRequired).toBe(false);
    expect(d.description).toBeNull();
    expect(d.missingRequired).toEqual(["startDate", "description"]);
    expect(d.confidence.location).toBeUndefined(); // sem confiança para campo vazio
  });

  it("readAgenda guarda a foto de forma privada, não cria eventos e devolve rascunhos", async () => {
    const s = await scenario();
    setAgendaAI(new MockAgendaAI("multi"));
    const before = await prisma.event.count({ where: { classId: s.cls.id } });
    const r = await readAgenda(s.member.id, s.cls.id, JPEG);
    expect(r.drafts.length).toBe(4);
    expect(await prisma.event.count({ where: { classId: s.cls.id } })).toBe(before); // IA nunca cadastra sozinha
    const up = await prisma.upload.findUniqueOrThrow({ where: { id: r.uploadId } });
    expect(up.storagePath).not.toMatch(/public/);
    expect(up.transcript).toContain("zoológico");
  });

  it("foto ilegível devolve erro tratável com o upload para preencher manualmente", async () => {
    const s = await scenario();
    setAgendaAI(new MockAgendaAI("erro"));
    const err = await readAgenda(s.member.id, s.cls.id, JPEG).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.message).toBe("Não consegui identificar todas as informações dessa foto.");
    expect(err.extra.uploadId).toBeTruthy();
  });

  it("valida tipo de arquivo e bloqueia visualizador", async () => {
    const s = await scenario();
    setAgendaAI(new MockAgendaAI("single"));
    const notImage = await readAgenda(s.member.id, s.cls.id, Buffer.from("<script>alert(1)</script>")).catch((e) => e);
    expect(notImage.status).toBe(415);
    const viewer = await readAgenda(s.viewer.id, s.cls.id, JPEG).catch((e) => e);
    expect(viewer.status).toBe(403);
  });
});
