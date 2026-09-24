// Fluxo "Cadastrar pela foto" (§16–§21, §43–§44): valida a imagem, guarda em storage
// privado, pede a extração à IA e converte a resposta em rascunhos para revisão humana.
// Nada é cadastrado aqui — o evento só nasce quando o usuário confirma a prévia.

import { prisma } from "@/server/db";
import { ApiError } from "@/server/http";
import { requireMember } from "@/server/classes/access";
import { saveImage, validateImage } from "@/server/storage/images";
import { categoryFromText, isAuthorizationItem, type CategoryId } from "@/lib/domain";
import { isValidKey, todayKey } from "@/lib/dates";
import { getAgendaAI } from "./index";
import { AIUnavailableError, rawResultSchema, type RawEvent, type RawResult } from "./types";

export const LOW_CONFIDENCE = 0.8;

export type DraftField = "title" | "startDate" | "startTime" | "eventType" | "location" | "amount" | "materials" | "description" | "notes";

export type AIDraft = {
  title: string | null;
  startDate: string | null;
  startTime: string | null;
  eventType: CategoryId | null;
  location: string | null;
  amount: number | null;
  materials: string[];
  authorizationRequired: boolean;
  description: string | null;
  notes: string | null;
  /** 0..1 por campo; só existe para campos que a IA preencheu. */
  confidence: Partial<Record<DraftField, number>>;
  lowConfidence: DraftField[];
  /** Data deduzida de expressão relativa — exige confirmação explícita. */
  relativeDate: { text: string; interpreted: string } | null;
  missingRequired: DraftField[];
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function normTime(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  let m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  m = s.match(/^([01]?\d|2[0-3])\s*h\s*([0-5]\d)?$/i);
  if (m) return `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`;
  return null;
}

const FIELD_MAP: Record<keyof RawEvent["confianca"], DraftField> = {
  titulo: "title", data: "startDate", horario: "startTime", tipo: "eventType", local: "location",
  valor: "amount", materiais: "materials", descricao: "description", observacoes: "notes",
};

/** Converte a resposta bruta da IA em rascunhos. Valores inválidos viram vazio — nunca um palpite. */
export function toDrafts(raw: RawResult): AIDraft[] {
  return raw.eventos
    .map((e): AIDraft => {
      const date = str(e.data);
      const materials = (e.materiais ?? []).map((m) => m.trim()).filter(Boolean);
      const amount = typeof e.valor === "number" && Number.isFinite(e.valor) && e.valor >= 0 ? Math.round(e.valor * 100) / 100 : null;
      const d: AIDraft = {
        title: str(e.titulo),
        startDate: date && isValidKey(date) ? date : null,
        startTime: normTime(e.horario),
        eventType: categoryFromText(e.tipo),
        location: str(e.local),
        amount,
        materials,
        authorizationRequired: e.autorizacao_necessaria === true || materials.some(isAuthorizationItem),
        description: str(e.descricao),
        notes: str(e.observacoes),
        confidence: {},
        lowConfidence: [],
        relativeDate: null,
        missingRequired: [],
      };
      for (const [k, field] of Object.entries(FIELD_MAP) as [keyof RawEvent["confianca"], DraftField][]) {
        const v = d[field];
        const filled = Array.isArray(v) ? v.length > 0 : v != null;
        if (!filled) continue;
        const c = Math.max(0, Math.min(100, Number(e.confianca?.[k] ?? 0))) / 100;
        d.confidence[field] = c;
        if (c < LOW_CONFIDENCE) d.lowConfidence.push(field);
      }
      if (e.data_relativa && d.startDate) d.relativeDate = { text: str(e.data_texto_original) ?? "data relativa", interpreted: d.startDate };
      d.missingRequired = (["title", "startDate", "eventType", "description"] as const).filter((f) => d[f] == null);
      return d;
    })
    .filter((d) => d.title || d.startDate);
}

export type ReadAgendaResult = { uploadId: string; transcript: string; provider: string; drafts: AIDraft[] };

export async function readAgenda(userId: string, classId: string, file: Buffer): Promise<ReadAgendaResult> {
  await requireMember(userId, classId, "ai.read");
  const mimeType = validateImage(file);
  const storagePath = await saveImage(classId, file, mimeType);
  const upload = await prisma.upload.create({ data: { classId, userId, storagePath, mimeType, size: file.length } });

  const ai = getAgendaAI();
  let raw: RawResult;
  try {
    raw = rawResultSchema.parse(await ai.extractEventsFromImage({ data: file, mimeType }, { referenceDate: todayKey() }));
  } catch (err) {
    if (err instanceof AIUnavailableError) throw new ApiError(503, "ia_indisponivel", err.message, { uploadId: upload.id });
    console.error("[ia] resposta inválida", err);
    raw = { legivel: false, texto_lido: "", eventos: [] };
  }

  await prisma.upload.update({ where: { id: upload.id }, data: { transcript: raw.texto_lido || null } });
  const drafts = raw.legivel ? toDrafts(raw) : [];
  if (!drafts.length) {
    throw new ApiError(422, "nao_identificado", "Não consegui identificar todas as informações dessa foto.", { uploadId: upload.id });
  }
  return { uploadId: upload.id, transcript: raw.texto_lido, provider: ai.name, drafts };
}
