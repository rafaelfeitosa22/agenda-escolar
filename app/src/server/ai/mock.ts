// Provedor falso para desenvolvimento e testes: resposta determinística, sem rede.
// AI_MOCK_SCENARIO: "multi" (padrão), "single", "relativa", "vazio" ou "erro".
import { addDays, parseKey } from "@/lib/dates";
import type { AgendaAIService, RawEvent, RawResult } from "./types";

const c = (o: Partial<RawEvent["confianca"]>): RawEvent["confianca"] => ({
  titulo: 0, data: 0, horario: 0, tipo: 0, local: 0, valor: 0, materiais: 0, descricao: 0, observacoes: 0, ...o,
});

const base = {
  data_relativa: false, horario: null, local: null, valor: null, materiais: [] as string[], autorizacao_necessaria: null, observacoes: null,
};

function nextWeekday(ref: string, weekday: number) {
  const d = parseKey(ref).getUTCDay();
  return addDays(ref, (weekday - d + 7) % 7 || 7);
}

export function mockResult(scenario: string, referenceDate: string): RawResult {
  const year = referenceDate.slice(0, 4);
  const zoo: RawEvent = {
    ...base,
    titulo: "Passeio ao Zoológico",
    data: `${year}-10-08`,
    data_texto_original: "Dia 08/10",
    horario: "08:00",
    tipo: "Passeio",
    local: "Zoológico",
    valor: 35,
    materiais: ["Autorização assinada"],
    autorizacao_necessaria: true,
    descricao: "Passeio ao zoológico",
    observacoes: "Saída às 8h",
    confianca: c({ titulo: 96, data: 95, horario: 91, tipo: 97, local: 72, valor: 98, materiais: 93, descricao: 90, observacoes: 88 }),
  };
  const pintura: RawEvent = {
    ...base,
    titulo: "Atividade de pintura",
    data: nextWeekday(referenceDate, 3),
    data_texto_original: "próxima quarta-feira",
    data_relativa: true,
    tipo: "Atividade",
    materiais: ["Camiseta velha"],
    descricao: "Atividade de pintura",
    confianca: c({ titulo: 92, data: 78, tipo: 90, materiais: 88, descricao: 85 }),
  };
  switch (scenario) {
    case "erro":
      return { legivel: false, texto_lido: "", eventos: [] };
    case "vazio":
      return { legivel: true, texto_lido: "Bom dia, família!", eventos: [] };
    case "single":
      return { legivel: true, texto_lido: "Dia 08/10 passeio ao zoológico. As crianças deverão trazer autorização assinada e R$ 35,00. Saída às 8h.", eventos: [zoo] };
    case "relativa":
      return { legivel: true, texto_lido: "Na próxima quarta-feira teremos atividade de pintura. Mandar camiseta velha.", eventos: [pintura] };
    default:
      return {
        legivel: true,
        texto_lido: "08/10 — Passeio ao zoológico (autorização assinada e R$ 35,00, saída às 8h). 10/10 — Feira cultural. 15/10 — Prova de matemática. Na próxima quarta-feira, pintura: mandar camiseta velha.",
        eventos: [
          zoo,
          { ...base, titulo: "Feira Cultural", data: `${year}-10-10`, data_texto_original: "10/10", tipo: "Evento escolar", descricao: "Feira cultural", confianca: c({ titulo: 94, data: 96, tipo: 70, descricao: 80 }) },
          { ...base, titulo: "Prova de Matemática", data: `${year}-10-15`, data_texto_original: "15/10", tipo: "Prova", descricao: "Prova de matemática", confianca: c({ titulo: 95, data: 97, tipo: 98, descricao: 85 }) },
          pintura,
        ],
      };
  }
}

export class MockAgendaAI implements AgendaAIService {
  readonly name = "mock";
  constructor(private scenario = process.env.AI_MOCK_SCENARIO || "multi") {}
  async extractEventsFromImage(_image: unknown, ctx: { referenceDate: string }) {
    if (process.env.NODE_ENV !== "test") await new Promise((r) => setTimeout(r, 900));
    return mockResult(this.scenario, ctx.referenceDate);
  }
}
