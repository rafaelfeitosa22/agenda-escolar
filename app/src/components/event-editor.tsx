"use client";
// Cadastro manual (passo a passo: tipo → essencial → detalhes) e edição de evento.
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EventDetail } from "@/server/events/service";
import { ApiClientError } from "@/lib/api";
import { category } from "@/lib/domain";
import { useClass } from "./class-context";
import { EventFields, emptyForm, formatAmount, toPayload, useEventSubmit, validate, type FieldErrors, type FormValue } from "./event-form";
import { BackBar, Button, ErrorBox } from "./ui";
import { flashNext } from "./toast";

const STEPS = ["Que tipo de evento?", "O essencial", "Detalhes"] as const;

export function NewEventForm({ initialDate, uploadId }: { initialDate?: string; uploadId?: string }) {
  const c = useClass();
  const router = useRouter();
  const { submit, dialogs } = useEventSubmit();
  const [step, setStep] = useState(0);
  const [v, setV] = useState<FormValue>({ ...emptyForm(), startDate: initialDate ?? "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<FormValue>) => {
    setV((x) => ({ ...x, ...p }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(p)) delete next[k as keyof FormValue];
      return next;
    });
  };

  async function save() {
    const errs = validate(v);
    setErrors(errs);
    if (errs.eventType) return setStep(0);
    if (errs.title || errs.startDate || errs.description) return setStep(1);
    if (Object.keys(errs).length) return setStep(2);
    setBusy(true);
    setError("");
    try {
      const r = await submit<{ event: { id: string } }>(`/api/classes/${c.classId}/events`, "POST", { ...toPayload(v), uploadId: uploadId ?? null });
      if (r) {
        flashNext("Evento cadastrado.");
        router.replace(`/t/${c.classId}/eventos/${r.event.id}`);
        router.refresh();
        return;
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível salvar.");
    }
    setBusy(false);
  }

  function next() {
    if (step === 1) {
      const errs = validate(v, ["title", "startDate", "description"]);
      setErrors(errs);
      if (Object.keys(errs).length) return;
    }
    setStep(step + 1);
  }

  const cat = v.eventType ? category(v.eventType) : null;

  return (
    <>
      <BackBar label={step === 0 ? "Cancelar" : "Voltar"} onBack={step === 0 ? undefined : () => setStep(step - 1)} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 px-5 pt-5 pb-4">
          <span className="kicker text-accent-700">
            Passo {step + 1} de 3{cat && step > 0 ? ` · ${cat.emoji} ${cat.label}` : ""}
          </span>
          <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.015em]">{STEPS[step]}</h1>
          {step === 2 && <p className="text-[15px] text-neutral-700">Tudo aqui é opcional. Preencha só o que a agenda informa.</p>}
          {uploadId && step === 0 && <p className="text-[15px] text-neutral-700">A foto da agenda ficará guardada junto com o evento.</p>}
        </div>
        <div className="flex flex-col gap-4 px-5 pb-6">
          <ErrorBox>{error}</ErrorBox>
          <EventFields
            value={v}
            onChange={(p) => {
              patch(p);
              if (step === 0 && p.eventType) setStep(1);
            }}
            groups={step === 0 ? ["type"] : step === 1 ? ["essential"] : ["details"]}
            errors={errors}
          />
        </div>
      </div>
      {step > 0 && (
        <div className="flex flex-none flex-col gap-2 border-t-2 border-ink px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
          {step === 1 ? (
            <>
              <Button variant="primary" size="lg" arrow onClick={next}>
                Continuar
              </Button>
              <Button onClick={save} disabled={busy}>
                {busy ? "Salvando…" : "Salvar sem detalhes"}
              </Button>
            </>
          ) : (
            <Button variant="primary" size="lg" arrow onClick={save} disabled={busy}>
              {busy ? "Salvando…" : "Salvar evento"}
            </Button>
          )}
        </div>
      )}
      {dialogs}
    </>
  );
}

export function fromEvent(e: EventDetail): FormValue {
  return {
    title: e.title,
    description: e.description,
    eventType: e.eventType as FormValue["eventType"],
    startDate: e.startDate,
    endDate: e.endDate ?? "",
    startTime: e.startTime ?? "",
    endTime: e.endTime ?? "",
    location: e.location ?? "",
    amount: formatAmount(e.amount),
    authorizationRequired: e.authorizationRequired,
    materials: e.materials,
    notes: e.notes ?? "",
    link: e.link ?? "",
    responsible: e.responsible ?? "",
    status: e.status,
  };
}

export function EditEventForm({ event }: { event: EventDetail }) {
  const c = useClass();
  const router = useRouter();
  const { submit, dialogs } = useEventSubmit();
  const [v, setV] = useState<FormValue>(() => fromEvent(event));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const errs = validate(v);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setError("Confira os campos destacados.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await submit(`/api/events/${event.id}`, "PUT", { ...toPayload(v), status: v.status });
      if (r) {
        flashNext("Alterações salvas.");
        router.replace(`/t/${c.classId}/eventos/${event.id}`);
        router.refresh();
        return;
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível salvar.");
    }
    setBusy(false);
  }

  return (
    <>
      <BackBar label="Cancelar" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 pt-5 pb-4">
          <span className="kicker text-accent-700">Editar evento</span>
          <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.015em]">{event.title}</h1>
          {!event.mine && <p className="mt-1 text-[15px] text-neutral-700">Cadastrado por {event.createdBy.name.split(" ")[0]}. A alteração fica registrada no histórico.</p>}
        </div>
        <div className="flex flex-col gap-6 px-5 pb-6">
          <ErrorBox>{error}</ErrorBox>
          <EventFields value={v} onChange={(p) => setV((x) => ({ ...x, ...p }))} groups={["essential", "type", "details", "status"]} errors={errors} />
        </div>
      </div>
      <div className="flex-none border-t-2 border-ink px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
        <Button variant="primary" size="lg" arrow onClick={save} disabled={busy}>
          {busy ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
      {dialogs}
    </>
  );
}
