import { body, json, route } from "@/server/http";
import { forgotPassword, forgotSchema } from "@/server/auth/service";
import { clientIp } from "@/server/auth/rate-limit";

export const POST = route(async (req) => {
  const { email } = await body(req, forgotSchema);
  await forgotPassword(email, clientIp(req));
  return json({ ok: true, message: "Se o e-mail estiver cadastrado, enviaremos um link para criar uma nova senha." });
});
