// Limite de tentativas em janela deslizante, guardado no banco para valer entre todas as
// instâncias do servidor (na Vercel cada requisição pode cair numa instância diferente).
import { prisma } from "@/server/db";

export async function rateLimit(key: string, max: number, windowMs: number): Promise<{ ok: boolean; retryAfter: number }> {
  const since = new Date(Date.now() - windowMs);
  const recent = await prisma.rateLimitHit.findMany({ where: { key, createdAt: { gt: since } }, orderBy: { createdAt: "asc" }, select: { createdAt: true }, take: max });
  if (recent.length >= max) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0].createdAt.getTime() + windowMs - Date.now()) / 1000)) };
  }
  await prisma.rateLimitHit.create({ data: { key } });
  // Limpeza ocasional de registros antigos (~1% das chamadas).
  if (Math.random() < 0.01) await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  return { ok: true, retryAfter: 0 };
}

export async function resetRateLimit(key: string) {
  await prisma.rateLimitHit.deleteMany({ where: { key } });
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
