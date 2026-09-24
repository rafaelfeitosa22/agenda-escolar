// Datas "de calendário" no fuso America/Sao_Paulo.
// Eventos guardam o dia como "YYYY-MM-DD"; toda aritmética é feita em UTC sobre esse dia,
// então não há deslocamento por fuso nem por horário de verão.

export const TZ = "America/Sao_Paulo";

export const WD = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
export const WDF = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
export const MON = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
export const MONF = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const P = (n: number) => String(n).padStart(2, "0");

/** Dia de hoje em São Paulo, como "YYYY-MM-DD". */
export function todayKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toKey(d: Date): string {
  return `${d.getUTCFullYear()}-${P(d.getUTCMonth() + 1)}-${P(d.getUTCDate())}`;
}

export function isValidKey(k: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
  return toKey(parseKey(k)) === k;
}

export function addDays(k: string, n: number): string {
  const d = parseKey(k);
  d.setUTCDate(d.getUTCDate() + n);
  return toKey(d);
}

export function diffDays(k: string, from: string): number {
  return Math.round((parseKey(k).getTime() - parseKey(from).getTime()) / 864e5);
}

export function rel(n: number): string {
  if (n === 0) return "Hoje";
  if (n === 1) return "Amanhã";
  if (n === -1) return "Ontem";
  return n > 0 ? `Em ${n} dias` : `Há ${-n} dias`;
}

export function parts(k: string) {
  const d = parseKey(k);
  return {
    day: d.getUTCDate(),
    dayNum: P(d.getUTCDate()),
    monNum: P(d.getUTCMonth() + 1),
    mon: MON[d.getUTCMonth()],
    monFull: MONF[d.getUTCMonth()],
    year: d.getUTCFullYear(),
    wd: WD[d.getUTCDay()],
    wdFull: WDF[d.getUTCDay()],
    weekday: d.getUTCDay(),
  };
}

/** "23/09" */
export const dateShort = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;
/** "23/09/2026" */
export const dateBR = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}/${k.slice(0, 4)}`;
/** "Quarta-feira, 23 de setembro" */
export function dateLong(k: string) {
  const p = parts(k);
  return `${p.wdFull}, ${p.day} de ${p.monFull}`;
}

/** Data/hora de um instante (ex.: created_at) no fuso de São Paulo. */
export function instantBR(d: Date) {
  const f = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).formatToParts(d);
  const g = (t: string) => f.find((p) => p.type === t)!.value;
  return { date: `${g("day")}/${g("month")}/${g("year")}`, time: `${g("hour")}:${g("minute")}` };
}

/** Converte "DD/MM/AAAA" em "AAAA-MM-DD" (ou null). */
export function brToKey(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const k = `${m[3]}-${P(+m[2])}-${P(+m[1])}`;
  return isValidKey(k) ? k : null;
}
