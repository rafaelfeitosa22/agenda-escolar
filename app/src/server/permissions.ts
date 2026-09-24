// Matriz de permissões por turma (ESPECIFICACAO.md §6).
// Novos níveis entram adicionando uma linha em GRANTS; as regras de "próprio evento"
// ficam em canOnEvent. Toda checagem de acesso passa por aqui no backend.

import type { Role } from "@/lib/domain";

export type Action =
  | "class.view"
  | "class.edit"
  | "class.manageMembers"
  | "event.view"
  | "event.create"
  | "event.editOwn"
  | "event.editAny"
  | "event.deleteOwn"
  | "event.deleteAny"
  | "ai.read";

const GRANTS: Record<Role, readonly Action[]> = {
  ADMIN: [
    "class.view", "class.edit", "class.manageMembers",
    "event.view", "event.create", "event.editOwn", "event.editAny", "event.deleteOwn", "event.deleteAny",
    "ai.read",
  ],
  MEMBRO: ["class.view", "event.view", "event.create", "event.editOwn", "event.deleteOwn", "ai.read"],
  VISUALIZADOR: ["class.view", "event.view"],
};

export function can(role: string, action: Action): boolean {
  return (GRANTS[role as Role] ?? []).includes(action);
}

export function canOnEvent(role: string, kind: "edit" | "delete", isOwner: boolean): boolean {
  if (can(role, kind === "edit" ? "event.editAny" : "event.deleteAny")) return true;
  return isOwner && can(role, kind === "edit" ? "event.editOwn" : "event.deleteOwn");
}
