// Auditoria de eventos (§22 e §24): snapshot dos campos rastreados, diff campo a campo e
// a frase exibida no detalhe ("Maria alterou o horário em 23/09/2026 às 19:32.").
import { instantBR } from "@/lib/dates";

export const TRACKED = [
  "title", "description", "eventType", "startDate", "endDate", "startTime", "endTime",
  "location", "amount", "authorizationRequired", "materials", "notes", "link", "responsible", "status",
] as const;

export type Snapshot = {
  title: string; description: string; eventType: string; startDate: string; endDate: string | null;
  startTime: string | null; endTime: string | null; location: string | null; amount: number | null;
  authorizationRequired: boolean; materials: string[]; notes: string | null; link: string | null;
  responsible: string | null; status: string;
};

type Source = Omit<Snapshot, "amount" | "materials"> & { amount: unknown; materials: { description: string }[] };

export function snapshot(e: Source): Snapshot {
  const s = {} as Record<string, unknown>;
  for (const k of TRACKED) s[k] = (e as Record<string, unknown>)[k] ?? null;
  s.amount = e.amount == null ? null : Number(e.amount);
  s.materials = e.materials.map((m) => m.description);
  return s as Snapshot;
}

export function diffSnapshots(before: Snapshot, after: Snapshot) {
  const old: Partial<Snapshot> = {}, next: Partial<Snapshot> = {};
  for (const k of TRACKED) {
    const a = before[k] ?? null, b = after[k] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      (old as Record<string, unknown>)[k] = a;
      (next as Record<string, unknown>)[k] = b;
    }
  }
  return { old, new: next };
}

const FIELD_LABEL: Record<string, string> = {
  title: "o título", description: "a descrição", eventType: "o tipo", startDate: "a data", endDate: "a data final",
  startTime: "o horário", endTime: "o horário final", location: "o local", amount: "o valor",
  authorizationRequired: "a autorização", materials: "os materiais", notes: "as observações", link: "o link",
  responsible: "o responsável", status: "o status",
};

export function describeChange(userName: string, oldJson: string | null, newJson: string | null, at: Date) {
  const { date, time } = instantBR(at);
  const next = newJson ? (JSON.parse(newJson) as Record<string, unknown>) : {};
  const keys = Object.keys(oldJson ? JSON.parse(oldJson) : next);
  const first = userName.split(" ")[0];
  let what: string;
  if (next.status === "cancelado") what = "cancelou o evento";
  else if (next.status === "concluido") what = "marcou o evento como concluído";
  else if (next.status === "ativo" && keys.length === 1) what = "reativou o evento";
  else if (keys.length === 1) what = `alterou ${FIELD_LABEL[keys[0]] ?? "o evento"}`;
  else if (keys.length === 2) what = `alterou ${FIELD_LABEL[keys[0]] ?? keys[0]} e ${FIELD_LABEL[keys[1]] ?? keys[1]}`;
  else what = "alterou o evento";
  return `${first} ${what} em ${date} às ${time}.`;
}
