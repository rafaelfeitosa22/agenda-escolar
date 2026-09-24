// Sessão em cookie httpOnly. O cookie guarda um token aleatório; o banco guarda só o hash.
import { cookies, headers } from "next/headers";
import { prisma } from "@/server/db";
import { unauthorized } from "@/server/http";
import { hashToken, newToken } from "./tokens";

export const SESSION_COOKIE = "adt_session";
const MAX_AGE_S = 60 * 60 * 24 * 30;

export async function createSession(userId: string) {
  const token = newToken();
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + MAX_AGE_S * 1000) },
  });
  // "secure" só em HTTPS: pelo IP da rede local (http://192.168...) o navegador descartaria o cookie.
  // Atrás de um proxy HTTPS em produção, x-forwarded-proto chega como "https".
  const proto = (await headers()).get("x-forwarded-proto")?.split(",")[0].trim();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: proto === "https" || process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export type CurrentUser = { id: string; name: string; email: string; avatar: string | null };

export async function getUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, email: true, avatar: true, status: true } } },
  });
  if (!s || s.expiresAt < new Date() || s.user.status !== "ativo") return null;
  const { status: _s, ...user } = s.user;
  return user;
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getUser();
  if (!u) throw unauthorized();
  return u;
}
