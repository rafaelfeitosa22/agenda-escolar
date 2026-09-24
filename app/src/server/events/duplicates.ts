// Detecção de possível duplicidade (ESPECIFICACAO.md §15 e §45).
// Mesma turma e mesma data são filtradas na consulta; aqui comparamos títulos por
// similaridade textual e usamos o horário quando os dois eventos o informam.
// Nunca bloqueia: o chamador devolve os candidatos e o usuário decide.

import { normalize } from "@/lib/domain";

const STOPWORDS = new Set(["a", "o", "as", "os", "ao", "aos", "de", "da", "do", "das", "dos", "no", "na", "nos", "nas", "em", "e", "para", "pra", "com", "um", "uma", "pelo", "pela"]);

export function tokens(title: string): string[] {
  return normalize(title).split(" ").filter((t) => t && !STOPWORDS.has(t));
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

const ratio = (a: string, b: string) => (a.length || b.length ? 1 - levenshtein(a, b) / Math.max(a.length, b.length) : 1);

/** 0..1 — tolera artigos/preposições trocados ("ao" × "no"), palavras faltando e erros de digitação. */
export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.length || !tb.length) return ratio(normalize(a), normalize(b));
  // Tokens casam se forem quase iguais (erros de digitação, plural).
  const used = new Set<number>();
  let matches = 0;
  for (const x of ta) {
    const j = tb.findIndex((y, k) => !used.has(k) && ratio(x, y) >= 0.8);
    if (j >= 0) { used.add(j); matches++; }
  }
  const dice = (2 * matches) / (ta.length + tb.length);
  return Math.max(dice, ratio(ta.join(" "), tb.join(" ")));
}

export const DUPLICATE_THRESHOLD = 0.6;

export type DupCandidate = { id: string; title: string; startDate: string; startTime: string | null };

export function findDuplicates<T extends DupCandidate>(input: { title: string; startTime?: string | null }, sameDay: T[]): (T & { similarity: number })[] {
  return sameDay
    .filter((e) => !(input.startTime && e.startTime && input.startTime !== e.startTime))
    .map((e) => ({ ...e, similarity: titleSimilarity(input.title, e.title) }))
    .filter((e) => e.similarity >= DUPLICATE_THRESHOLD)
    .sort((x, y) => y.similarity - x.similarity);
}
