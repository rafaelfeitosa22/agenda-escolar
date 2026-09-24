// Vocabulário do domínio compartilhado entre servidor e cliente.

export const CATEGORIES = [
  { id: "tarefa", label: "Tarefa", emoji: "📚" },
  { id: "prova", label: "Prova", emoji: "📝" },
  { id: "passeio", label: "Passeio", emoji: "🚌" },
  { id: "festa", label: "Festa", emoji: "🎉" },
  { id: "atividade", label: "Atividade", emoji: "🎨" },
  { id: "material", label: "Material", emoji: "🎒" },
  { id: "evento_escolar", label: "Evento escolar", emoji: "🏫" },
  { id: "reuniao", label: "Reunião", emoji: "👩‍🏫" },
  { id: "pagamento", label: "Pagamento", emoji: "💰" },
  { id: "informativo", label: "Informativo", emoji: "📢" },
  { id: "aniversario", label: "Aniversário", emoji: "🎂" },
  { id: "outros", label: "Outros", emoji: "🗓️" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function category(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Aceita id ("passeio") ou rótulo ("Passeio", "evento escolar"), como a IA pode devolver. */
export function categoryFromText(text: string | null | undefined): CategoryId | null {
  if (!text) return null;
  const n = normalize(text);
  const found = CATEGORIES.find((c) => c.id === n.replace(/ /g, "_") || normalize(c.label) === n);
  return found ? found.id : null;
}

export const ROLES = ["ADMIN", "MEMBRO", "VISUALIZADOR"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  MEMBRO: "Membro",
  VISUALIZADOR: "Visualizador",
};

export const EVENT_STATUS = ["ativo", "concluido", "cancelado"] as const;
export type EventStatus = (typeof EVENT_STATUS)[number];
export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function money(v: number) {
  return "R$ " + v.toFixed(2).replace(".", ",");
}

/** Materiais que são, na verdade, a autorização não contam como "material" nos alertas. */
export function isAuthorizationItem(m: string) {
  return /autoriza/i.test(m);
}
