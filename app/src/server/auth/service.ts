import { z } from "zod";
import { prisma } from "@/server/db";
import { ApiError } from "@/server/http";
import { hashPassword, verifyPassword } from "./password";
import { hashToken, newToken } from "./tokens";
import { createSession } from "./session";
import { rateLimit, resetRateLimit } from "./rate-limit";

const email = z.string().trim().toLowerCase().email("E-mail inválido.").max(160);
const password = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(200);

export const registerSchema = z.object({ name: z.string().trim().min(2, "Informe o nome do aluno(a).").max(80), email, password });
export const loginSchema = z.object({ email, password: z.string().min(1, "Informe a senha.").max(200) });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(10).max(200), password });
export const changePasswordSchema = z.object({ current: z.string().min(1).max(200), password });
export const profileSchema = z.object({ name: z.string().trim().min(2, "Informe o nome do aluno(a).").max(80), avatar: z.string().url().max(500).nullable().optional() });

export async function register(input: z.infer<typeof registerSchema>) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new ApiError(409, "email_em_uso", "Já existe uma conta com este e-mail.");
  const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) } });
  await createSession(user.id);
  return { id: user.id, name: user.name, email: user.email };
}

// Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar contas.
let dummyHash: Promise<string> | null = null;

export async function login(input: z.infer<typeof loginSchema>, ip: string) {
  const key = `login:${ip}:${input.email}`;
  const rl = await rateLimit(key, 5, 15 * 60 * 1000);
  const rlIp = await rateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000);
  if (!rl.ok || !rlIp.ok) {
    throw new ApiError(429, "muitas_tentativas", `Muitas tentativas. Tente novamente em ${Math.ceil(Math.max(rl.retryAfter, rlIp.retryAfter) / 60)} min.`);
  }
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  dummyHash ??= hashPassword("senha-inexistente");
  const ok = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash));
  if (!user || !ok) throw new ApiError(401, "credenciais_invalidas", "E-mail ou senha incorretos.");
  if (user.status !== "ativo") throw new ApiError(403, "conta_inativa", "Esta conta está desativada.");
  await resetRateLimit(key);
  await createSession(user.id);
  return { id: user.id, name: user.name, email: user.email };
}

/** Gera o link de redefinição. Sem serviço de e-mail configurado, o link aparece no log do servidor (dev). */
export async function forgotPassword(emailAddr: string, ip: string) {
  if (!(await rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000)).ok) throw new ApiError(429, "muitas_tentativas", "Muitas tentativas. Tente mais tarde.");
  const user = await prisma.user.findUnique({ where: { email: emailAddr } });
  if (!user) return; // resposta idêntica para não revelar se o e-mail existe
  const token = newToken();
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  const link = `${process.env.APP_URL || "http://localhost:3000"}/redefinir-senha?token=${token}`;
  console.info(`[auth] Link de redefinição de senha para ${user.email}: ${link}`);
}

export async function resetPassword(token: string, newPassword: string) {
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new ApiError(400, "link_invalido", "Este link expirou ou já foi usado. Peça um novo.");
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(newPassword) } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: row.userId } }),
  ]);
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(current, user.passwordHash))) throw new ApiError(400, "senha_atual_incorreta", "A senha atual está incorreta.");
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
  await createSession(userId);
}

export async function updateProfile(userId: string, input: z.infer<typeof profileSchema>) {
  const u = await prisma.user.update({ where: { id: userId }, data: { name: input.name, ...(input.avatar !== undefined ? { avatar: input.avatar } : {}) } });
  return { id: u.id, name: u.name, email: u.email, avatar: u.avatar };
}
