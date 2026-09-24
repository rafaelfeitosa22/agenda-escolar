import { ApiError, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/auth/rate-limit";
import { readAgenda } from "@/server/ai/read-agenda";
import { MAX_BYTES } from "@/server/storage/images";

export const maxDuration = 120;

export const POST = route(async (req) => {
  const user = await requireUser();
  if (!(await rateLimit("ai:" + user.id, 30, 60 * 60 * 1000)).ok) throw new ApiError(429, "muitas_leituras", "Muitas fotos em pouco tempo. Tente de novo mais tarde.");
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BYTES + 64 * 1024) throw new ApiError(413, "arquivo_grande", "A foto é grande demais.");

  const form = await req.formData().catch(() => null);
  const classId = form?.get("classId");
  const image = form?.get("image");
  if (typeof classId !== "string" || !(image instanceof File)) throw new ApiError(400, "dados_invalidos", "Envie a foto e a turma.");
  if (image.size > MAX_BYTES) throw new ApiError(413, "arquivo_grande", "A foto é grande demais.");

  return json(await readAgenda(user.id, classId, Buffer.from(await image.arrayBuffer())));
});
