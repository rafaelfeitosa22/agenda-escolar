// Utilitários das rotas REST: erros tipados, validação com zod e respostas JSON.
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const unauthorized = () => new ApiError(401, "nao_autenticado", "Faça login para continuar.");
export const forbidden = (msg = "Você não tem permissão para esta ação.") => new ApiError(403, "sem_permissao", msg);
// 404 (e não 403) quando o recurso é de outra turma: não revela que ele existe.
export const notFound = (msg = "Não encontrado.") => new ApiError(404, "nao_encontrado", msg);

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

export function route<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.code, message: err.message, ...err.extra }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "dados_invalidos", message: err.issues[0]?.message ?? "Dados inválidos.", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
          { status: 400 },
        );
      }
      console.error(err);
      return NextResponse.json({ error: "erro_interno", message: "Algo deu errado. Tente novamente." }, { status: 500 });
    }
  };
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    throw new ApiError(400, "json_invalido", "Corpo da requisição inválido.");
  }
  return schema.parse(data);
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
