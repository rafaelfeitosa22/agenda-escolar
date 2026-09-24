"use client";
// Cadastrar pela foto (§16–§21, §43–§44, §50): foto → IA → prévia → confirmação → duplicidade → cadastro.
// A IA só preenche a prévia; cada evento é confirmado por uma pessoa antes de existir.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { AIDraft, ReadAgendaResult } from "@/server/ai/read-agenda";
import { api, ApiClientError } from "@/lib/api";
import { category, money } from "@/lib/domain";
import { dateBR, dateShort, parts } from "@/lib/dates";
import { useClass } from "./class-context";
import { EventFields, emptyForm, formatAmount, parseAmount, toPayload, useEventSubmit, validate, type FieldErrors, type FormValue } from "./event-form";
import { BackBar, Button, ErrorBox, Loading } from "./ui";
import { flashNext } from "./toast";

type Item = { draft: AIDraft; value: FormValue; selected: boolean; dateConfirmed: boolean; status: "pendente" | "salvo" | "pulado" };

const MAX_SIDE = 2000;

/** Reduz a foto no aparelho (JPEG, lado maior ≤ 2000px): envio mais rápido e dentro do limite. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 3 * 1024 * 1024 && /jpe?g|png|webp/.test(file.type)) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej()), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

function toForm(d: AIDraft): FormValue {
  return {
    ...emptyForm(),
    title: d.title ?? "",
    description: d.description ?? "",
    eventType: d.eventType ?? "",
    startDate: d.startDate ?? "",
    startTime: d.startTime ?? "",
    location: d.location ?? "",
    amount: formatAmount(d.amount),
    authorizationRequired: d.authorizationRequired,
    materials: d.materials,
    notes: d.notes ?? "",
  };
}

export function PhotoFlow() {
  const c = useClass();
  const router = useRouter();
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"pick" | "reading" | "error" | "select" | "review">("pick");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ReadAgendaResult | null>(null);
  const [failUpload, setFailUpload] = useState<string | null>(null);
  const [failMsg, setFailMsg] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setPhase("reading");
    try {
      const blob = await shrink(f);
      const form = new FormData();
      form.set("classId", c.classId);
      form.set("image", blob, "agenda.jpg");
      const r = await api<ReadAgendaResult>("/api/ai/read-agenda", { form });
      setResult(r);
      setItems(r.drafts.map((d) => ({ draft: d, value: toForm(d), selected: true, dateConfirmed: !d.relativeDate, status: "pendente" })));
      setIdx(0);
      setPhase(r.drafts.length > 1 ? "select" : "review");
    } catch (err) {
      const e = err instanceof ApiClientError ? err : null;
      setFailUpload((e?.data.uploadId as string) ?? null);
      setFailMsg(e && e.code !== "nao_identificado" ? e.message : "");
      setPhase("error");
    } finally {
      if (camRef.current) camRef.current.value = "";
      if (galRef.current) galRef.current.value = "";
    }
  }

  const queue = items.map((it, i) => ({ it, i })).filter(({ it }) => it.selected);

  function finish(list: Item[]) {
    const saved = list.filter((x) => x.status === "salvo").length;
    if (saved) flashNext(saved === 1 ? "Evento cadastrado para toda a turma." : `${saved} eventos cadastrados para toda a turma.`);
    router.replace(saved > 0 ? `/t/${c.classId}/agenda?v=todos` : `/t/${c.classId}/hoje`);
    router.refresh();
  }

  function advance(list: Item[]) {
    const pos = queue.findIndex((q) => q.i === idx);
    const next = queue.slice(pos + 1).find((q) => list[q.i].status === "pendente");
    if (next) setIdx(next.i);
    else finish(list);
  }

  const inputs = (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={galRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
    </>
  );

  if (phase === "pick" || phase === "reading" || phase === "error") {
    return (
      <>
        <BackBar label="Cancelar" href={`/t/${c.classId}/hoje`} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 pt-5 pb-4">
            <span className="kicker text-accent-700">📷 Cadastrar pela foto</span>
            <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.015em]">
              {phase === "error" ? "Não consegui identificar todas as informações dessa foto." : "Fotografe a página da agenda"}
            </h1>
            {phase === "pick" && <p className="mt-2 text-[15px] text-neutral-700">A IA lê o que a professora escreveu e monta a prévia. Nada é cadastrado sem você conferir e confirmar.</p>}
            {phase === "error" && (
              <p className="mt-2 text-[15px] text-neutral-700">{failMsg || "Tente outra foto com boa luz e a página inteira enquadrada, ou preencha os dados você mesmo."}</p>
            )}
          </div>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Foto selecionada" className="photo-bw mx-5 max-h-[38vh] w-[calc(100%-40px)] border-2 border-ink object-contain" />
          )}
          {phase === "reading" && <Loading label="Lendo a agenda…" />}
          {phase === "pick" && (
            <ul className="mx-5 flex flex-col border-t-2 border-ink text-[15px]">
              {["Enquadre a página inteira", "Evite sombra e reflexo", "Uma foto pode ter vários eventos"].map((t) => (
                <li key={t} className="border-b-2 border-divider py-3">
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
        {phase !== "reading" && (
          <div className="flex flex-none flex-col gap-2 border-t-2 border-ink px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
            <Button variant="primary" size="lg" arrow onClick={() => camRef.current?.click()}>
              {phase === "error" ? "Tentar novamente" : "📷 Tirar foto"}
            </Button>
            {phase === "error" ? (
              <Link href={`/t/${c.classId}/eventos/novo${failUpload ? `?foto=${failUpload}` : ""}`} className="flex h-12 items-center border-2 border-ink px-4 text-[15px] font-extrabold hover:bg-surface">
                ✏️ Preencher manualmente
              </Link>
            ) : (
              <Button onClick={() => galRef.current?.click()}>🖼️ Escolher da galeria</Button>
            )}
          </div>
        )}
        {inputs}
      </>
    );
  }

  if (phase === "select") {
    const n = items.filter((x) => x.selected).length;
    return (
      <>
        <BackBar label="Cancelar" href={`/t/${c.classId}/hoje`} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 pt-5 pb-4">
            <span className="kicker text-accent-700">A IA leu a foto</span>
            <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.015em]">Foram encontrados {items.length} eventos</h1>
            <p className="mt-2 text-[15px] text-neutral-700">Escolha quais deseja cadastrar. Você confere cada um antes de salvar.</p>
          </div>
          <div className="border-t-2 border-ink">
            {items.map((it, i) => {
              const cat = it.draft.eventType ? category(it.draft.eventType) : null;
              return (
                <button
                  key={i}
                  role="checkbox"
                  aria-checked={it.selected}
                  onClick={() => setItems(items.map((x, j) => (j === i ? { ...x, selected: !x.selected } : x)))}
                  className="flex min-h-14 w-full items-center gap-3 border-b-2 border-divider px-5 py-3 text-left hover:bg-surface"
                >
                  <span className={`flex size-6 flex-none items-center justify-center border-2 border-ink text-[15px] font-extrabold text-bg ${it.selected ? "bg-ink" : ""}`}>{it.selected ? "✓" : ""}</span>
                  <span className="flex flex-col">
                    <span className="text-base font-extrabold">
                      {cat?.emoji ?? "🗓️"} {it.draft.title ?? "Sem título"}
                    </span>
                    <span className="text-[13px] text-neutral-700">{it.draft.startDate ? dateShort(it.draft.startDate) : "Data não encontrada"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-none border-t-2 border-ink px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
          <Button
            variant="primary"
            size="lg"
            arrow
            disabled={!n}
            onClick={() => {
              setIdx(items.findIndex((x) => x.selected));
              setPhase("review");
            }}
          >
            {n ? `Conferir ${n} ${n === 1 ? "evento" : "eventos"}` : "Selecione ao menos um"}
          </Button>
        </div>
      </>
    );
  }

  const pos = queue.findIndex((q) => q.i === idx);
  return (
    <Review
      key={idx}
      item={items[idx]}
      label={queue.length > 1 ? `Evento ${pos + 1} de ${queue.length}` : "Prévia do evento"}
      uploadId={result!.uploadId}
      transcript={result!.transcript}
      preview={preview}
      multiple={queue.length > 1}
      onChange={(it) => setItems(items.map((x, j) => (j === idx ? it : x)))}
      onDone={(status) => {
        const list = items.map((x, j) => (j === idx ? { ...x, status } : x));
        setItems(list);
        advance(list);
      }}
    />
  );
}

const LABEL: Record<string, string> = {
  title: "Título", startDate: "Data", startTime: "Horário", eventType: "Tipo", location: "Local", amount: "Valor",
  materials: "Materiais", description: "Descrição", notes: "Observações",
};

function Review({
  item, label, uploadId, transcript, preview, multiple, onChange, onDone,
}: {
  item: Item; label: string; uploadId: string; transcript: string; preview: string | null; multiple: boolean;
  onChange: (it: Item) => void; onDone: (s: "salvo" | "pulado") => void;
}) {
  const c = useClass();
  const { submit, dialogs } = useEventSubmit();
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { draft: d, value: v } = item;
  const rd = d.relativeDate;
  const dateChanged = rd && v.startDate !== rd.interpreted;

  async function confirm() {
    const errs = validate(v);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setEditing(true);
      setError("Complete os campos obrigatórios que a foto não informou.");
      return;
    }
    if (!item.dateConfirmed) {
      setError("Confirme a data interpretada pela IA.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await submit(`/api/classes/${c.classId}/events`, "POST", { ...toPayload(v), uploadId });
      if (r) return onDone("salvo");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível salvar.");
    }
    setBusy(false);
  }

  const row = (field: string, value: React.ReactNode) => {
    const low = d.lowConfidence.includes(field as never) && !editing;
    const empty = value == null || value === "" || (Array.isArray(value) && !value.length);
    return (
      <div key={field} className={`flex flex-col gap-0.5 border-b-2 border-divider px-5 py-3 ${low ? "bg-accent-100" : ""}`}>
        <span className="flex items-baseline justify-between gap-2">
          <span className="kicker">{LABEL[field]}</span>
          {low && <span className="text-xs font-semibold text-accent-800">Confira · {Math.round((d.confidence[field as never] ?? 0) * 100)}%</span>}
        </span>
        {empty ? <span className="text-base text-neutral-600">Não encontrado na foto</span> : <span className="text-base font-semibold text-pretty">{value}</span>}
      </div>
    );
  };

  const cat = v.eventType ? category(v.eventType) : null;
  const amountN = parseAmount(v.amount);
  const amount = amountN != null && !Number.isNaN(amountN) ? money(amountN) : null;

  return (
    <>
      <BackBar label={editing ? "Voltar à prévia" : "Cancelar"} onBack={editing ? () => setEditing(false) : undefined} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-start gap-3 px-5 pt-5 pb-4">
          <div className="flex flex-1 flex-col gap-1">
            <span className="kicker text-accent-700">{label}</span>
            <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.015em]">{editing ? "Corrigir dados" : "A IA encontrou:"}</h1>
          </div>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Foto da agenda" className="photo-bw size-16 flex-none border-2 border-ink object-cover" />
          )}
        </div>

        {rd && !item.dateConfirmed && (
          <div className="mx-5 mb-4 flex flex-col gap-2 border-2 border-ink bg-surface p-4" role="group" aria-label="Confirmar data">
            <span className="text-base">
              A IA interpretou “{rd.text}” como <strong>{dateBR(rd.interpreted)}</strong> ({parts(rd.interpreted).wdFull.toLowerCase()}).
            </span>
            <span className="text-lg font-extrabold">Está correto?</span>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ink" onClick={() => onChange({ ...item, dateConfirmed: true })}>
                Sim
              </Button>
              <Button
                onClick={() => {
                  onChange({ ...item, dateConfirmed: true });
                  setEditing(true);
                }}
              >
                Alterar
              </Button>
            </div>
          </div>
        )}

        <div className="px-5">
          <ErrorBox>{error}</ErrorBox>
        </div>

        {editing ? (
          <div className="flex flex-col gap-5 px-5 pt-2 pb-6">
            <EventFields
              value={v}
              onChange={(p) => onChange({ ...item, value: { ...v, ...p } })}
              groups={["essential", "type", "details"]}
              errors={errors}
              confidence={d.confidence}
              lowConfidence={d.lowConfidence}
            />
          </div>
        ) : (
          <div className="border-t-2 border-ink">
            {row("title", v.title)}
            {row("startDate", v.startDate ? `${dateBR(v.startDate)} · ${parts(v.startDate).wdFull}${dateChanged ? " (alterada)" : ""}` : null)}
            {row("startTime", v.startTime)}
            {row("eventType", cat ? `${cat.emoji} ${cat.label}` : null)}
            {row("location", v.location)}
            {row("amount", amount)}
            {row("description", v.description)}
            {row("materials", v.materials.length ? v.materials.join(", ") : null)}
            {row("notes", v.notes)}
            {v.authorizationRequired && <div className="border-b-2 border-divider px-5 py-3 text-base font-semibold">📄 Autorização assinada necessária</div>}
            {transcript && (
              <details className="px-5 py-3">
                <summary className="cursor-pointer py-1 text-[15px] font-extrabold">Texto lido na foto</summary>
                <p className="pt-2 text-[15px] text-pretty text-neutral-800">“{transcript}”</p>
              </details>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-none flex-col gap-2 border-t-2 border-ink px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
        <Button variant="primary" size="lg" arrow onClick={confirm} disabled={busy}>
          {busy ? "Salvando…" : "Confirmar evento"}
        </Button>
        <div className={multiple ? "grid grid-cols-2 gap-2" : ""}>
          {!editing ? (
            <Button onClick={() => setEditing(true)}>Editar</Button>
          ) : (
            <Button onClick={() => setEditing(false)}>Ver prévia</Button>
          )}
          {multiple && (
            <Button variant="danger" onClick={() => onDone("pulado")}>
              Pular
            </Button>
          )}
        </div>
      </div>
      {dialogs}
    </>
  );
}
