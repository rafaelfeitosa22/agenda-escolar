"use client";
// Detalhe do evento (handoff › Telas › 3).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { EventDetail } from "@/server/events/service";
import { api, ApiClientError } from "@/lib/api";
import { dateBR, instantBR, parts, rel } from "@/lib/dates";
import { hasMaterial, shareText, view } from "@/lib/event-view";
import { money } from "@/lib/domain";
import { useClass } from "./class-context";
import { IconChevronRight, IconShare } from "./icons";
import { BackBar, Button, Dialog } from "./ui";
import { flashNext, useToast } from "./toast";

const MISS = "Não informado";

export function EventDetailView({ event: e }: { event: EventDetail }) {
  const c = useClass();
  const router = useRouter();
  const toast = useToast();
  const v = view(e, c.today);
  const p = parts(e.startDate);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [original, setOriginal] = useState(false);

  // Checklist "Necessário levar": estado local de cada usuário, neste aparelho.
  const storeKey = `adt_chk:${c.user.id}:${e.id}`;
  useEffect(() => {
    try {
      setChecked(JSON.parse(localStorage.getItem(storeKey) || "{}"));
    } catch {}
  }, [storeKey]);
  const toggle = (i: number) => {
    const next = { ...checked, [i]: !checked[i] };
    setChecked(next);
    try {
      localStorage.setItem(storeKey, JSON.stringify(next));
    } catch {}
  };

  async function share() {
    const text = shareText(e);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      return; // usuário cancelou o menu nativo
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Texto copiado. Cole no WhatsApp.");
    } catch {
      toast("Não foi possível compartilhar.");
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api(`/api/events/${e.id}`, { method: "DELETE" });
      flashNext("Evento excluído.");
      if (history.length > 1) router.back();
      else router.replace(`/t/${c.classId}/hoje`);
      router.refresh();
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "Não foi possível excluir.");
      setDeleting(false);
      setConfirmDel(false);
    }
  }

  const facts = [
    { icon: "📅", label: "Data", value: dateBR(e.startDate), sub: `${p.wdFull} · ${rel(v.n).toLowerCase()}` },
    { icon: "⏰", label: "Horário", value: e.startTime ? (e.endTime ? `${e.startTime}–${e.endTime}` : e.startTime) : MISS },
    { icon: "📍", label: "Local", value: e.location || MISS },
    { icon: "💰", label: "Valor", value: e.amount ? money(e.amount) : MISS },
  ];
  const alerts = v.canceled
    ? []
    : [e.amount ? "💰 Pagamento necessário" : null, e.authorizationRequired ? "📄 Autorização necessária" : null, hasMaterial(e) ? "🎒 Material necessário" : null].filter(Boolean);
  const created = instantBR(new Date(e.createdAt));

  return (
    <div className="flex flex-col">
      <BackBar
        right={
          <button onClick={share} aria-label="Compartilhar" className="flex size-11 items-center justify-center">
            <IconShare />
          </button>
        }
      />
      <div className="flex flex-col gap-2 px-5 pt-5 pb-4">
        <span className="text-[13px] font-semibold tracking-[.08em] text-accent-700 uppercase">
          {v.emoji} {v.type}
        </span>
        <h1 className={`text-[30px] leading-[1.1] font-extrabold tracking-[-0.015em] text-pretty ${v.canceled ? "line-through" : ""}`}>{e.title}</h1>
        {v.canceled && <span className="self-start bg-ink px-2 py-1 text-[13px] font-extrabold tracking-[.06em] text-bg">❌ CANCELADO</span>}
        {e.status === "concluido" && <span className="self-start bg-surface px-2 py-1 text-[13px] font-extrabold tracking-[.06em]">✓ CONCLUÍDO</span>}
      </div>

      <div className="grid grid-cols-2 gap-0.5 border-y-2 border-divider bg-divider">
        {facts.map((f) => (
          <div key={f.label} className="flex flex-col gap-0.5 bg-bg px-5 pt-3 pb-3.5">
            <span className="kicker">
              {f.icon} {f.label}
            </span>
            <span className={`text-lg font-extrabold break-words ${f.value === MISS ? "text-neutral-600" : ""}`}>{f.value}</span>
            {f.sub && <span className="text-[13px] text-neutral-700">{f.sub}</span>}
          </div>
        ))}
      </div>

      {!!alerts.length && (
        <div className="flex flex-wrap gap-1.5 px-5 pt-4">
          {alerts.map((a) => (
            <span key={a} className="bg-accent-100 px-2 py-[5px] text-[13px] font-semibold text-accent-800">
              {a}
            </span>
          ))}
        </div>
      )}

      <section className="flex flex-col gap-1 px-5 pt-5">
        <h2 className="label-section">Descrição</h2>
        <p className="text-base text-pretty whitespace-pre-line">{e.description}</p>
      </section>

      {!!e.materials.length && (
        <section className="flex flex-col px-5 pt-5">
          <h2 className="label-section border-b-2 border-ink pb-2">Necessário levar</h2>
          {e.materials.map((m, i) => (
            <button key={i} onClick={() => toggle(i)} role="checkbox" aria-checked={!!checked[i]} className="flex min-h-12 w-full items-center gap-3 border-b-2 border-divider py-2 text-left">
              <span className={`flex size-6 flex-none items-center justify-center border-2 border-ink text-[15px] font-extrabold text-bg ${checked[i] ? "bg-ink" : ""}`}>{checked[i] ? "✓" : ""}</span>
              <span className={`text-base ${checked[i] ? "text-neutral-700 line-through" : ""}`}>{m}</span>
            </button>
          ))}
          <span className="pt-1.5 text-xs text-neutral-700">Marque o que já separou. Só você vê.</span>
        </section>
      )}

      {e.notes && (
        <section className="flex flex-col gap-1 px-5 pt-5">
          <h2 className="label-section">Observações</h2>
          <p className="text-base text-pretty whitespace-pre-line">{e.notes}</p>
        </section>
      )}

      {(e.link || e.responsible || e.endDate) && (
        <section className="flex flex-col gap-1 px-5 pt-5 text-[15px]">
          {e.endDate && <span><strong>Até:</strong> {dateBR(e.endDate)}</span>}
          {e.responsible && <span><strong>Responsável:</strong> {e.responsible}</span>}
          {e.link && (
            <a href={e.link} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold break-all text-accent-700 underline underline-offset-2">
              {e.link}
            </a>
          )}
        </section>
      )}

      {e.source === "foto" && (
        <button onClick={() => setOriginal(true)} className="mx-5 mt-5 flex items-center gap-3 border-2 border-ink p-2.5 text-left hover:bg-surface">
          <span className="placeholder-stripes relative size-[52px] flex-none overflow-hidden">
            {e.originalImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.originalImageUrl} alt="" className="photo-bw size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-xl">📷</span>
            )}
          </span>
          <span className="flex flex-1 flex-col">
            <span className="kicker">Origem: foto da agenda</span>
            <span className="text-[15px] font-extrabold">Ver foto original</span>
          </span>
          <IconChevronRight size={18} stroke={2.4} />
        </button>
      )}

      <div className="mx-5 mt-5 flex flex-col gap-0.5 border-t-2 border-divider pt-3 text-sm">
        <span>
          <strong>Cadastrado por:</strong> {e.createdBy.name.split(" ")[0]}
        </span>
        <span>
          <strong>Cadastrado em:</strong> {created.date}
        </span>
        {e.lastChange && <span className="mt-1 text-neutral-700">{e.lastChange}</span>}
      </div>

      <div className="flex flex-col gap-2 p-5">
        <Button variant="primary" size="lg" arrow onClick={share}>
          Compartilhar com a família
        </Button>
        {(e.can.edit || e.can.delete) && (
          <div className="grid grid-cols-2 gap-2">
            {e.can.edit ? (
              <Link href={`/t/${c.classId}/eventos/${e.id}/editar`} className="flex h-12 items-center border-2 border-ink px-4 text-[15px] font-extrabold hover:bg-surface">
                Editar
              </Link>
            ) : (
              <span />
            )}
            {e.can.delete && (
              <Button variant="danger" onClick={() => setConfirmDel(true)}>
                Excluir
              </Button>
            )}
          </div>
        )}
      </div>

      {confirmDel && (
        <Dialog title="Tem certeza que deseja excluir este evento?" onClose={() => setConfirmDel(false)}>
          <span className="text-[15px] text-neutral-800">“{e.title}” deixará de aparecer para toda a turma.</span>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setConfirmDel(false)} autoFocus>
              Cancelar
            </Button>
            <Button variant="dangerSolid" onClick={remove} disabled={deleting}>
              {deleting ? "Excluindo…" : "Excluir"}
            </Button>
          </div>
        </Dialog>
      )}

      {original && <OriginalPhoto url={e.originalImageUrl} by={e.createdBy.name} when={e.photoTakenAt ?? e.createdAt} text={e.sourceText} onClose={() => setOriginal(false)} />}
    </div>
  );
}

function OriginalPhoto({ url, by, when, text, onClose }: { url: string | null; by: string; when: string; text: string | null; onClose: () => void }) {
  useEffect(() => {
    const h = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const [failed, setFailed] = useState(!url);
  return (
    <div role="dialog" aria-modal="true" aria-label="Foto original" className="fixed inset-0 z-50 flex justify-center bg-ink text-bg">
      <div className="flex w-full max-w-[480px] flex-col gap-3.5 px-5 pt-[calc(24px+env(safe-area-inset-top))] pb-8">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold tracking-[.08em] uppercase">Foto original · {instantBR(new Date(when)).date}</span>
          <button onClick={onClose} className="h-11 border-2 border-bg px-3 text-sm font-extrabold">
            Fechar
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[repeating-linear-gradient(135deg,var(--color-neutral-800)_0_10px,var(--color-neutral-900)_10px_20px)]">
          {failed ? (
            <span className="self-end p-3 font-mono text-xs text-neutral-300">foto da agenda (imagem enviada por {by.split(" ")[0]}) </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url!} alt={`Foto da agenda enviada por ${by}`} className="photo-bw max-h-full w-full object-contain" onError={() => setFailed(true)} />
          )}
        </div>
        {text && (
          <div className="flex flex-col gap-1 border-t-2 border-neutral-600 pt-3">
            <span className="text-xs font-semibold tracking-[.08em] text-neutral-400 uppercase">Texto lido na foto</span>
            <span className="text-base text-pretty">“{text}”</span>
          </div>
        )}
      </div>
    </div>
  );
}
