// Regras de apresentação de um evento — portadas do vm() do protótipo.
import type { EventDTO } from "@/server/events/service";
import { category, isAuthorizationItem, money } from "./domain";
import { dateShort, diffDays, parts, rel } from "./dates";

export type { EventDTO };

export const ACCENT_TEXT = "text-accent-700";
export const MUTED_TEXT = "text-neutral-700";

export function hasMaterial(e: Pick<EventDTO, "materials">) {
  return e.materials.some((m) => !isAuthorizationItem(m));
}

export function view(e: EventDTO, today: string) {
  const n = diffDays(e.startDate, today);
  const p = parts(e.startDate);
  const cat = category(e.eventType);
  const canceled = e.status === "cancelado";
  const flags: { t: string; canceled?: boolean }[] = [];
  if (canceled) flags.push({ t: "❌ Cancelado", canceled: true });
  else {
    if (e.amount) flags.push({ t: "💰 " + money(e.amount) });
    if (e.authorizationRequired) flags.push({ t: "📄 Autorização" });
    if (hasMaterial(e)) flags.push({ t: "🎒 Material" });
    if (e.startTime) flags.push({ t: "⏰ " + e.startTime });
  }
  const flagTxt = canceled ? [] : [e.amount ? money(e.amount) : null, e.authorizationRequired ? "autorização" : null, hasMaterial(e) ? "material" : null].filter(Boolean);
  return {
    n,
    canceled,
    emoji: cat.emoji,
    type: cat.label,
    dayNum: p.dayNum,
    monNum: p.monNum,
    mon: p.mon,
    wd: p.wd,
    dateShort: dateShort(e.startDate),
    rel: canceled ? "Cancelado" : rel(n),
    relAccent: !canceled && n <= 7,
    flags,
    flagLine: flagTxt.length ? " · " + flagTxt.join(" · ") : "",
    metaLine: canceled ? "Cancelado" : [e.startTime, e.location].filter(Boolean).join(" · ") || cat.label,
    todayNote: e.eventType === "tarefa" ? "Entrega hoje" : e.startTime ? "Às " + e.startTime : "Hoje",
    summary: e.materials.length ? "Levar: " + e.materials.join(", ") : e.description,
  };
}

/** Texto de compartilhamento (handoff › Interações › Compartilhar). */
export function shareText(e: EventDTO) {
  const cat = category(e.eventType);
  const lines = [`${cat.emoji} ${e.title}`, "", `📅 ${dateShort(e.startDate)}`];
  if (e.startTime) lines.push(`⏰ ${e.startTime}`);
  if (e.location) lines.push(`📍 ${e.location}`);
  if (e.amount) lines.push(`💰 ${money(e.amount)}`);
  if (e.status === "cancelado") lines.push("", "❌ CANCELADO");
  else if (e.materials.length) lines.push("", `Não esquecer: ${e.materials.join(", ")}.`);
  return lines.join("\n");
}
