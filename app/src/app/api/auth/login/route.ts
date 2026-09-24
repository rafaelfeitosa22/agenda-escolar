import { body, json, route } from "@/server/http";
import { login, loginSchema } from "@/server/auth/service";
import { clientIp } from "@/server/auth/rate-limit";

export const POST = route(async (req) => json({ user: await login(await body(req, loginSchema), clientIp(req)) }));
