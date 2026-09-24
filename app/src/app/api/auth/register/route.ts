import { body, json, route } from "@/server/http";
import { register, registerSchema } from "@/server/auth/service";

export const POST = route(async (req) => json({ user: await register(await body(req, registerSchema)) }, 201));
