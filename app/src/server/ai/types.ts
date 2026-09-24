// Contrato da camada de IA (§42). A aplicação só conhece AgendaAIService; cada fornecedor
// implementa extractEventsFromImage e devolve o formato bruto abaixo, validado com zod.
import { z } from "zod";
import { CATEGORIES } from "@/lib/domain";

const TIPOS = CATEGORIES.map((c) => c.label) as [string, ...string[]];

const conf = z.number().describe("Confiança de 0 a 100 na leitura deste campo. Use 0 quando o campo estiver vazio.");

export const rawEventSchema = z.object({
  titulo: z.string().nullable().describe("Título curto do compromisso, como a professora escreveu. null se não houver."),
  data: z.string().nullable().describe("Data no formato AAAA-MM-DD. null se a foto não indicar a data."),
  data_texto_original: z.string().nullable().describe('Trecho literal que indica a data (ex.: "dia 08/10", "próxima quarta-feira"). null se não houver.'),
  data_relativa: z.boolean().describe("true quando a data foi deduzida de uma expressão relativa (amanhã, próxima quarta, semana que vem)."),
  horario: z.string().nullable().describe("Horário HH:MM (24h). null se não houver."),
  tipo: z.enum(TIPOS).nullable().describe("Categoria do evento. null se não der para saber."),
  local: z.string().nullable(),
  valor: z.number().nullable().describe("Valor em reais, só se estiver escrito."),
  materiais: z.array(z.string()).describe("Itens que a criança deve levar, exatamente como escritos. Lista vazia se não houver."),
  autorizacao_necessaria: z.boolean().nullable().describe("true só se a foto pedir autorização assinada."),
  descricao: z.string().nullable().describe("Descrição curta com as palavras da foto."),
  observacoes: z.string().nullable().describe("Outras instruções escritas (ex.: horário de saída, uniforme)."),
  confianca: z.object({
    titulo: conf, data: conf, horario: conf, tipo: conf, local: conf, valor: conf, materiais: conf, descricao: conf, observacoes: conf,
  }),
});

export const rawResultSchema = z.object({
  legivel: z.boolean().describe("false se a foto não for uma agenda/anotação legível."),
  texto_lido: z.string().describe("Transcrição fiel do texto relevante da foto."),
  eventos: z.array(rawEventSchema),
});

export type RawEvent = z.infer<typeof rawEventSchema>;
export type RawResult = z.infer<typeof rawResultSchema>;

export type AgendaImage = { data: Buffer; mimeType: "image/jpeg" | "image/png" | "image/webp" };
export type ExtractContext = { referenceDate: string /* YYYY-MM-DD, dia da foto em São Paulo */ };

export interface AgendaAIService {
  readonly name: string;
  extractEventsFromImage(image: AgendaImage, ctx: ExtractContext): Promise<RawResult>;
}

export class AIUnavailableError extends Error {}
