// Helpers para Server Components: sessão obrigatória e turma acessível.
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/server/auth/session";
import { getClass } from "@/server/classes/service";
import { ApiError } from "@/server/http";

export async function pageUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function pageClass(classId: string) {
  const user = await pageUser();
  try {
    return { user, cls: await getClass(user.id, classId) };
  } catch (e) {
    if (e instanceof ApiError) notFound();
    throw e;
  }
}

/** Converte ApiError de leitura (404/403) em página 404. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }
}
