"use client";
// Agenda — Semana | Mês | Todos | Meus (handoff › Telas › 2). A visão fica na URL (?v=)
// para o "Voltar" do detalhe retornar à mesma aba.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { addDays, dateLong, MONF, parseKey, parts, rel, toKey } from "@/lib/dates";
import { view, type EventDTO } from "@/lib/event-view";
import { canCreate, useClass } from "./class-context";
import { IconChevronLeft, IconChevronRight, IconPlus } from "./icons";
import { AddSheet } from "./shell";

type V = "semana" | "mes" | "todos" | "meus";
const SEGS: [V, string][] = [["semana", "Semana"], ["mes", "Mês"], ["todos", "Todos"], ["meus", "Meus"]];

export function AgendaView({ events }: { events: EventDTO[] }) {
  const c = useClass();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const v = (SEGS.find(([k]) => k === sp.get("v"))?.[0] ?? "semana") as V;

  const setParams = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, val] of Object.entries(patch)) val == null ? q.delete(k) : q.set(k, val);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col">
      <h1 className="px-5 pt-5 pb-3 text-[30px] font-extrabold tracking-[-0.015em]">Agenda</h1>
      <div className="mx-5 grid grid-cols-4 border-2 border-ink" role="tablist">
        {SEGS.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={v === k}
            onClick={() => setParams({ v: k })}
            className={`h-11 px-2 text-left text-sm font-semibold ${v === k ? "bg-ink text-bg" : "bg-transparent hover:bg-surface"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {v === "semana" && <Week events={events} today={c.today} />}
      {v === "mes" && <Month events={events} today={c.today} month={sp.get("m")} day={sp.get("d")} setParams={setParams} canAdd={canCreate(c.role)} />}
      {(v === "todos" || v === "meus") && <List events={v === "meus" ? events.filter((e) => e.mine) : events.filter((e) => e.startDate >= c.today)} today={c.today} mine={v === "meus"} />}
    </div>
  );
}

function useHref() {
  const c = useClass();
  return (id: string) => `/t/${c.classId}/eventos/${id}`;
}

function Week({ events, today }: { events: EventDTO[]; today: string }) {
  const href = useHref();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  return (
    <div className="mt-4 border-t-2 border-ink">
      {days.map((d, i) => {
        const p = parts(d);
        const evs = events.filter((e) => e.startDate === d);
        return (
          <div key={d} className="grid grid-cols-[72px_1fr] border-b-2 border-divider">
            <div className={`flex flex-col py-3 pl-5 leading-none ${i === 0 ? "text-accent-700" : ""}`}>
              <span className="text-xs font-semibold tracking-[.06em]">{p.wd}</span>
              <span className="mt-1 text-[28px] font-extrabold">{p.day}</span>
              {i === 0 && <span className="mt-1 text-xs font-semibold">HOJE</span>}
            </div>
            <div className="flex flex-col justify-center py-1.5 pr-5">
              {evs.map((e) => {
                const v = view(e, today);
                return (
                  <Link key={e.id} href={href(e.id)} className="flex flex-col gap-px py-2">
                    <span className={`text-base font-semibold ${v.canceled ? "line-through" : ""}`}>
                      {v.emoji} {e.title}
                    </span>
                    <span className="text-[13px] text-neutral-700">{v.metaLine}</span>
                  </Link>
                );
              })}
              {!evs.length && <span className="py-2 text-sm text-neutral-700">Nenhum evento</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Month({
  events, today, month, day, setParams, canAdd,
}: { events: EventDTO[]; today: string; month: string | null; day: string | null; setParams: (p: Record<string, string | null>) => void; canAdd: boolean }) {
  const href = useHref();
  const [add, setAdd] = useState(false);
  const ym = month && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7);
  const first = parseKey(`${ym}-01`);
  const y = first.getUTCFullYear(), m = first.getUTCMonth();
  const lead = (first.getUTCDay() + 6) % 7; // semana começa na segunda
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const sel = day && day.startsWith(ym) ? day : ym === today.slice(0, 7) ? today : `${ym}-01`;
  const shift = (n: number) => setParams({ m: toKey(new Date(Date.UTC(y, m + n, 1))).slice(0, 7), d: null });

  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => toKey(new Date(Date.UTC(y, m, i + 1))))];
  while (cells.length % 7) cells.push(null);
  const selEvents = events.filter((e) => e.startDate === sel);

  return (
    <>
      <div className="px-5 pt-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-[.02em] uppercase">
            {MONF[m]} {y}
          </span>
          <div className="flex gap-1">
            <button onClick={() => shift(-1)} aria-label="Mês anterior" className="flex size-11 items-center justify-center border-2 border-ink hover:bg-surface">
              <IconChevronLeft size={18} stroke={2.4} />
            </button>
            <button onClick={() => shift(1)} aria-label="Próximo mês" className="flex size-11 items-center justify-center border-2 border-ink hover:bg-surface">
              <IconChevronRight size={18} stroke={2.4} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 pb-1.5">
          {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((h) => (
            <span key={h} className="pl-1 text-xs font-semibold tracking-[.04em]">
              {h}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5 border-2 border-divider bg-divider">
          {cells.map((k, i) => {
            if (!k) return <span key={i} className="h-[52px] bg-bg" />;
            const evs = events.filter((e) => e.startDate === k);
            const isSel = k === sel, isToday = k === today;
            return (
              <button
                key={k}
                onClick={() => setParams({ m: ym, d: k })}
                aria-label={`${dateLong(k)}${evs.length ? `, ${evs.length} ${evs.length === 1 ? "evento" : "eventos"}` : ""}`}
                aria-pressed={isSel}
                className={`flex h-[52px] flex-col items-start justify-between p-1 text-left ${isSel ? "bg-ink text-bg" : isToday ? "bg-bg text-accent-700" : "bg-bg"}`}
              >
                <span className={`text-sm ${isSel || isToday ? "font-extrabold" : "font-normal"}`}>{parseKey(k).getUTCDate()}</span>
                <span className="text-[13px] leading-none tracking-[-1px]">
                  {evs.slice(0, 3).map((e) => (e.status === "cancelado" ? "✕" : view(e, today).emoji)).join("")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between border-b-2 border-ink px-5 pt-5 pb-2.5">
        <span className="label-section">{dateLong(sel)}</span>
        {canAdd && (
          <button onClick={() => setAdd(true)} aria-label="Adicionar evento neste dia" className="-my-2 flex size-9 items-center justify-center hover:bg-surface">
            <IconPlus size={20} stroke={2.4} />
          </button>
        )}
      </div>
      {selEvents.map((e) => {
        const v = view(e, today);
        return (
          <Link key={e.id} href={href(e.id)} className="flex items-center gap-3 border-b-2 border-divider px-5 py-3.5 hover:bg-surface">
            <span className="flex size-10 flex-none items-center justify-center bg-surface text-xl">{v.emoji}</span>
            <span className="flex flex-col gap-px">
              <span className={`text-base font-semibold ${v.canceled ? "line-through" : ""}`}>{e.title}</span>
              <span className="text-[13px] text-neutral-700">{v.metaLine}</span>
            </span>
          </Link>
        );
      })}
      {!selEvents.length && <div className="px-5 py-4 text-sm text-neutral-700">Nenhum evento neste dia.</div>}
      <div className="h-6" />
      {add && <AddSheet date={sel} onClose={() => setAdd(false)} />}
    </>
  );
}

function List({ events, today, mine }: { events: EventDTO[]; today: string; mine: boolean }) {
  const href = useHref();
  const groups: { date: string; events: EventDTO[] }[] = [];
  for (const e of events) {
    const g = groups[groups.length - 1];
    if (g && g.date === e.startDate) g.events.push(e);
    else groups.push({ date: e.startDate, events: [e] });
  }
  return (
    <>
      <div className="px-5 pt-3 text-[13px] text-neutral-700">{mine ? "Eventos que você cadastrou" : "Próximos eventos, em ordem de data"}</div>
      <div className="mt-2">
        {groups.map((g) => {
          const p = parts(g.date);
          const n = Math.round((parseKey(g.date).getTime() - parseKey(today).getTime()) / 864e5);
          return (
            <div key={g.date} className="grid grid-cols-[72px_1fr] border-t-2 border-ink">
              <div className="flex flex-col py-3.5 pl-5 leading-none">
                <span className="text-[30px] font-extrabold">{p.dayNum}</span>
                <span className="mt-1 text-xs font-semibold tracking-[.06em]">
                  {p.mon} · {p.wd}
                </span>
              </div>
              <div className="flex flex-col py-1 pr-5">
                <span className={`kicker pt-3 ${n >= 0 && n <= 7 ? "text-accent-700" : "text-neutral-700"}`}>{rel(n)}</span>
                {g.events.map((e) => {
                  const v = view(e, today);
                  return (
                    <Link key={e.id} href={href(e.id)} className="flex flex-col gap-1.5 pt-1.5 pb-3">
                      <span className={`text-[17px] leading-[1.25] font-extrabold ${v.canceled ? "line-through" : ""}`}>
                        {v.emoji} {e.title}
                      </span>
                      {!!v.flags.length && (
                        <span className="flex flex-wrap gap-1">
                          {v.flags.map((f) => (
                            <span key={f.t} className={`px-1.5 py-0.5 text-xs font-semibold ${f.canceled ? "bg-ink text-bg" : "bg-accent-100 text-accent-800"}`}>
                              {f.t}
                            </span>
                          ))}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!groups.length && (
          <div className="border-t-2 border-ink p-5 text-[15px]">{mine ? "Você ainda não cadastrou eventos." : "Nenhum evento futuro cadastrado."}</div>
        )}
        <div className="h-6 border-t-2 border-ink" />
      </div>
    </>
  );
}
