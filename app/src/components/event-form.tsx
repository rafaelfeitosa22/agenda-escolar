"use client";
// Campos de evento reutilizados no cadastro manual, na edição e na revisão da IA,
// e o hook que envia com os avisos de "evento no passado" e "possível duplicado".
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { api, ApiClientError } from "@/lib/api";
import { CATEGORIES, EVENT_STATUS, EVENT_STATUS_LABEL, category, type CategoryId, type EventStatus } from "@/lib/domain";
import { dateBR } from "@/lib/dates";
import { useClass } from "./class-context";
import { IconX } from "./icons";
import { Button, Dialog, Field } from "./ui";

export type FormValue = {
  title: string;
  description: string;
  eventType: CategoryId | "";
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  amount: string;
  authorizationRequired: boolean;
  materials: string[];
  notes: string;
  link: string;
  responsible: string;
  status: EventStatus;
};

export const emptyForm = (): FormValue => ({
  title: "", description: "", eventType: "", startDate: "", endDate: "", startTime: "", endTime: "", location: "",
  amount: "", authorizationRequired: false, materials: [], notes: "", link: "", responsible: "", status: "ativo",
});

export function parseAmount(s: string): number | null {
  const t = s.replace(/[R$\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

export const formatAmount = (n: number | null | undefined) => (n == null ? "" : n.toFixed(2).replace(".", ","));

export type FieldErrors = Partial<Record<keyof FormValue, string>>;

export function validate(v: FormValue, only?: (keyof FormValue)[]): FieldErrors {
  const e: FieldErrors = {};
  const need = (k: keyof FormValue) => !only || only.includes(k);
  if (need("eventType") && !v.eventType) e.eventType = "Escolha o tipo.";
  if (need("title") && !v.title.trim()) e.title = "Informe o título.";
  if (need("startDate") && !v.startDate) e.startDate = "Informe a data.";
  if (need("description") && !v.description.trim()) e.description = "Informe a descrição.";
  if (need("amount") && Number.isNaN(parseAmount(v.amount))) e.amount = "Valor inválido. Ex.: 35,00";
  if (need("endDate") && v.endDate && v.startDate && v.endDate < v.startDate) e.endDate = "A data final deve ser depois da data inicial.";
  if (need("link") && v.link && !/^https?:\/\/\S+\.\S+/i.test(v.link.trim())) e.link = "Use um link começando com http:// ou https://";
  return e;
}

export function toPayload(v: FormValue) {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    eventType: v.eventType,
    startDate: v.startDate,
    endDate: v.endDate || null,
    startTime: v.startTime || null,
    endTime: v.endTime || null,
    location: v.location.trim() || null,
    amount: parseAmount(v.amount),
    authorizationRequired: v.authorizationRequired,
    materials: v.materials.map((m) => m.trim()).filter(Boolean),
    notes: v.notes.trim() || null,
    link: v.link.trim() || null,
    responsible: v.responsible.trim() || null,
  };
}

type Group = "type" | "essential" | "details" | "status";

export function EventFields({
  value: v, onChange, groups, errors = {}, confidence, lowConfidence = [],
}: {
  value: FormValue;
  onChange: (patch: Partial<FormValue>) => void;
  groups: Group[];
  errors?: FieldErrors;
  confidence?: Partial<Record<string, number>>;
  lowConfidence?: string[];
}) {
  const hl = (k: string) =>
    lowConfidence.includes(k) ? (
      <span className="bg-accent-100 px-1.5 py-0.5 text-xs font-semibold text-accent-800">Confira · {Math.round((confidence?.[k] ?? 0) * 100)}%</span>
    ) : undefined;
  const low = (k: string) => (lowConfidence.includes(k) ? "bg-accent-100" : "");
  const set = <K extends keyof FormValue>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange({ [k]: e.target.value } as Partial<FormValue>);

  return (
    <div className="flex flex-col gap-5">
      {groups.includes("type") && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 flex w-full items-baseline justify-between">
            <span className="kicker">Tipo</span>
            {hl("eventType")}
          </legend>
          <div className="grid grid-cols-2 gap-0.5 border-2 border-ink bg-ink">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.id}
                aria-pressed={v.eventType === c.id}
                onClick={() => onChange({ eventType: c.id })}
                className={`flex min-h-14 items-center gap-2.5 px-3 text-left text-[15px] font-semibold ${v.eventType === c.id ? "bg-ink text-bg" : "bg-bg hover:bg-surface"}`}
              >
                <span className="text-[22px]">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
          {errors.eventType && <span className="text-[13px] font-semibold text-accent-700">{errors.eventType}</span>}
        </fieldset>
      )}

      {groups.includes("essential") && (
        <>
          <Field label="Título" error={errors.title} highlight={hl("title")}>
            <input className={`field-input ${low("title")}`} value={v.title} onChange={set("title")} maxLength={120} placeholder="Ex.: Passeio ao Zoológico" aria-invalid={!!errors.title} />
          </Field>
          <Field label="Data" error={errors.startDate} highlight={hl("startDate")}>
            <input type="date" className={`field-input ${low("startDate")}`} value={v.startDate} onChange={set("startDate")} aria-invalid={!!errors.startDate} />
          </Field>
          <Field label="Descrição" error={errors.description} highlight={hl("description")}>
            <textarea className={`field-input min-h-24 resize-y ${low("description")}`} value={v.description} onChange={set("description")} maxLength={2000} placeholder="O que a professora escreveu" aria-invalid={!!errors.description} />
          </Field>
        </>
      )}

      {groups.includes("details") && (
        <>
          <Field label="Horário" highlight={hl("startTime")}>
            <input type="time" className={`field-input ${low("startTime")}`} value={v.startTime} onChange={set("startTime")} />
          </Field>
          <Field label="Valor (R$)" error={errors.amount} highlight={hl("amount")}>
            <input inputMode="decimal" className={`field-input ${low("amount")}`} value={v.amount} onChange={set("amount")} placeholder="0,00" aria-invalid={!!errors.amount} />
          </Field>
          <Field label="Local" highlight={hl("location")}>
            <input className={`field-input ${low("location")}`} value={v.location} onChange={set("location")} maxLength={120} />
          </Field>
          <Materials value={v.materials} onChange={(materials) => onChange({ materials })} highlight={hl("materials")} />
          <label className="flex min-h-12 cursor-pointer items-center gap-3 border-2 border-ink px-3">
            <input type="checkbox" className="size-5 accent-[var(--color-ink)]" checked={v.authorizationRequired} onChange={(e) => onChange({ authorizationRequired: e.target.checked })} />
            <span className="text-base font-semibold">📄 Precisa de autorização assinada</span>
          </label>
          <Field label="Observações" highlight={hl("notes")}>
            <textarea className={`field-input min-h-20 resize-y ${low("notes")}`} value={v.notes} onChange={set("notes")} maxLength={2000} />
          </Field>
          <details className="border-t-2 border-divider pt-3">
            <summary className="cursor-pointer py-2 text-[15px] font-extrabold">Mais opções</summary>
            <div className="flex flex-col gap-4 pt-3">
              <Field label="Data final" error={errors.endDate}>
                <input type="date" className="field-input" value={v.endDate} onChange={set("endDate")} min={v.startDate || undefined} />
              </Field>
              <Field label="Horário final">
                <input type="time" className="field-input" value={v.endTime} onChange={set("endTime")} />
              </Field>
              <Field label="Responsável">
                <input className="field-input" value={v.responsible} onChange={set("responsible")} maxLength={120} placeholder="Ex.: Professora Júlia" />
              </Field>
              <Field label="Link" error={errors.link}>
                <input type="url" inputMode="url" className="field-input" value={v.link} onChange={set("link")} placeholder="https://" />
              </Field>
            </div>
          </details>
        </>
      )}

      {groups.includes("status") && (
        <fieldset>
          <legend className="kicker mb-2">Status</legend>
          <div className="grid grid-cols-3 border-2 border-ink">
            {EVENT_STATUS.map((s) => (
              <button type="button" key={s} aria-pressed={v.status === s} onClick={() => onChange({ status: s })} className={`h-11 px-2 text-left text-sm font-semibold ${v.status === s ? "bg-ink text-bg" : "hover:bg-surface"}`}>
                {EVENT_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

function Materials({ value, onChange, highlight }: { value: string[]; onChange: (v: string[]) => void; highlight?: ReactNode }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (t) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between">
        <span className="kicker">Necessário levar</span>
        {highlight}
      </span>
      {value.map((m, i) => (
        <div key={i} className="flex min-h-12 items-center gap-2 border-b-2 border-divider">
          <span className="flex-1 text-base">🎒 {m}</span>
          <button type="button" aria-label={`Remover ${m}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="flex size-11 items-center justify-center hover:bg-surface">
            <IconX size={18} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          className="field-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          maxLength={200}
          placeholder="Ex.: Tesoura sem ponta"
          aria-label="Novo item para levar"
        />
        <button type="button" onClick={add} className="min-h-12 flex-none border-2 border-ink px-4 font-extrabold hover:bg-surface">
          Adicionar
        </button>
      </div>
    </div>
  );
}

type Dup = { id: string; title: string; startDate: string; startTime: string | null; eventType: string };
type Ask = { kind: "past" } | { kind: "dup"; dups: Dup[] };
type Answer = "yes" | "no" | { view: string };

/**
 * Envia o evento e conduz os avisos do servidor (409): data no passado (§46) e
 * possível duplicidade (§15) — nunca bloqueia em definitivo, sempre há "mesmo assim".
 */
export function useEventSubmit() {
  const c = useClass();
  const router = useRouter();
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolver = useRef<((a: Answer) => void) | null>(null);

  const prompt = (a: Ask) =>
    new Promise<Answer>((resolve) => {
      resolver.current = resolve;
      setAsk(a);
    });
  const answer = (a: Answer) => {
    setAsk(null);
    resolver.current?.(a);
  };

  async function submit<T>(url: string, method: "POST" | "PUT", payload: Record<string, unknown>): Promise<T | null> {
    const flags = { force: false, confirmPast: false };
    for (;;) {
      try {
        return await api<T>(url, { method, body: { ...payload, ...flags } });
      } catch (err) {
        if (!(err instanceof ApiClientError) || err.status !== 409) throw err;
        if (err.code === "evento_passado") {
          if ((await prompt({ kind: "past" })) !== "yes") return null;
          flags.confirmPast = true;
        } else if (err.code === "possivel_duplicado") {
          const a = await prompt({ kind: "dup", dups: (err.data.duplicates as Dup[]) ?? [] });
          if (typeof a === "object") {
            router.push(`/t/${c.classId}/eventos/${a.view}`);
            return null;
          }
          if (a !== "yes") return null;
          flags.force = true;
        } else throw err;
      }
    }
  }

  const dialogs =
    ask?.kind === "past" ? (
      <Dialog title="Este evento está no passado. Deseja continuar?" onClose={() => answer("no")}>
        <span className="text-[15px] text-neutral-800">Você pode cadastrar eventos passados para manter o histórico da turma.</span>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Button onClick={() => answer("no")}>Cancelar</Button>
          <Button variant="ink" onClick={() => answer("yes")} autoFocus>
            Continuar
          </Button>
        </div>
      </Dialog>
    ) : ask?.kind === "dup" ? (
      <Dialog title="⚠️ Parece que este evento já foi cadastrado." onClose={() => answer("no")}>
        <div className="mt-1 flex flex-col border-t-2 border-ink">
          {ask.dups.slice(0, 3).map((d) => (
            <div key={d.id} className="flex items-center gap-3 border-b-2 border-divider py-3">
              <span className="flex size-10 flex-none items-center justify-center bg-surface text-xl">{category(d.eventType).emoji}</span>
              <span className="flex flex-col">
                <span className="text-base font-extrabold">{d.title}</span>
                <span className="text-[13px] text-neutral-700">
                  {dateBR(d.startDate)}
                  {d.startTime ? ` · ${d.startTime}` : ""}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex flex-col gap-2">
          <Button onClick={() => answer({ view: ask.dups[0].id })}>Ver evento</Button>
          <Button variant="ink" onClick={() => answer("yes")}>
            Cadastrar mesmo assim
          </Button>
        </div>
        <button type="button" onClick={() => answer("no")} className="mt-1 h-11 text-left text-[15px] font-semibold text-accent-700">
          Não cadastrar
        </button>
      </Dialog>
    ) : null;

  return { submit, dialogs };
}
