"use client";
// Busca (§27) e filtros (§28) sobre os eventos da turma.
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, category, normalize } from "@/lib/domain";
import { dateBR } from "@/lib/dates";
import { hasMaterial, view, type EventDTO } from "@/lib/event-view";
import { useClass } from "./class-context";
import { IconSearch } from "./icons";

const FILTERS = [
  ["futuros", "Futuros"],
  ["passados", "Passados"],
  ["pagamento", "💰 Pagamento"],
  ["material", "🎒 Material"],
  ["autorizacao", "📄 Autorização"],
  ["meus", "Meus"],
] as const;
type F = (typeof FILTERS)[number][0];

export function SearchView({ events }: { events: EventDTO[] }) {
  const c = useClass();
  const [q, setQ] = useState("");
  const [on, setOn] = useState<Set<F>>(new Set());
  const [type, setType] = useState("");
  const [by, setBy] = useState("");
  const authors = useMemo(() => [...new Map(events.map((e) => [e.createdBy.id, e.createdBy.name])).entries()], [events]);

  const results = useMemo(() => {
    const terms = normalize(q).split(" ").filter(Boolean);
    return events.filter((e) => {
      if (on.has("futuros") && e.startDate < c.today) return false;
      if (on.has("passados") && e.startDate >= c.today) return false;
      if (on.has("pagamento") && !e.amount) return false;
      if (on.has("material") && !hasMaterial(e)) return false;
      if (on.has("autorizacao") && !e.authorizationRequired) return false;
      if (on.has("meus") && !e.mine) return false;
      if (type && e.eventType !== type) return false;
      if (by && e.createdBy.id !== by) return false;
      if (!terms.length) return true;
      const hay = normalize([e.title, e.description, e.location, category(e.eventType).label, dateBR(e.startDate), e.createdBy.name, e.notes, ...e.materials].filter(Boolean).join(" "));
      return terms.every((t) => hay.includes(t));
    });
  }, [events, q, on, type, by, c.today]);

  const toggle = (f: F) => {
    const next = new Set(on);
    if (next.has(f)) next.delete(f);
    else {
      next.add(f);
      if (f === "futuros") next.delete("passados");
      if (f === "passados") next.delete("futuros");
    }
    setOn(next);
  };
  const active = q || on.size || type || by;
  // Sem busca nem filtro, mostra só os próximos eventos.
  const shown = active ? results : results.filter((e) => e.startDate >= c.today);

  return (
    <div className="flex flex-col pb-6">
      <h1 className="px-5 pt-5 pb-3 text-[30px] font-extrabold tracking-[-0.015em]">Buscar</h1>
      <div className="px-5">
        <label className="flex items-center gap-2 border-2 border-ink bg-bg px-3 focus-within:outline-2 focus-within:outline-accent">
          <IconSearch size={20} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔎 Buscar na agenda"
            aria-label="Buscar na agenda"
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none"
            autoFocus
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map(([k, label]) => (
            <button key={k} onClick={() => toggle(k)} aria-pressed={on.has(k)} className={`h-9 border-2 border-ink px-2.5 text-sm font-semibold ${on.has(k) ? "bg-ink text-bg" : "hover:bg-surface"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo" className="h-11 border-2 border-ink bg-bg px-2 text-sm font-semibold">
            <option value="">Todos os tipos</option>
            {CATEGORIES.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.emoji} {ct.label}
              </option>
            ))}
          </select>
          <select value={by} onChange={(e) => setBy(e.target.value)} aria-label="Quem cadastrou" className="h-11 border-2 border-ink bg-bg px-2 text-sm font-semibold">
            <option value="">Qualquer pessoa</option>
            {authors.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-5 flex items-baseline justify-between border-b-2 border-ink px-5 pb-2.5">
        <span className="label-section">{active ? "Resultados" : "Próximos eventos"}</span>
        <span className="text-[13px] text-neutral-700">{shown.length}</span>
      </div>
      {shown.slice(0, 100).map((e) => {
        const v = view(e, c.today);
        return (
          <Link key={e.id} href={`/t/${c.classId}/eventos/${e.id}`} className="grid grid-cols-[52px_1fr] items-center gap-3.5 border-b-2 border-divider px-5 py-3.5 hover:bg-surface">
            <span className="flex flex-col leading-none">
              <span className="text-[26px] font-extrabold">{v.dayNum}</span>
              <span className="mt-[3px] text-xs font-semibold tracking-[.06em]">
                {v.mon} {e.startDate.slice(2, 4)}
              </span>
            </span>
            <span className="flex min-w-0 flex-col gap-[3px]">
              <span className={`text-base leading-[1.25] font-semibold ${v.canceled ? "line-through" : ""}`}>
                {v.emoji} {e.title}
              </span>
              <span className="text-[13px] text-neutral-700">
                {v.rel}
                {v.flagLine} · por {e.createdBy.name.split(" ")[0]}
              </span>
            </span>
          </Link>
        );
      })}
      {!shown.length && <div className="px-5 py-5 text-[15px] text-neutral-700">Nada encontrado. Tente outra palavra.</div>}
    </div>
  );
}
