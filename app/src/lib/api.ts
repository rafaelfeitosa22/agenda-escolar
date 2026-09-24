// Cliente da API REST para os componentes do navegador.
export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public data: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? (init.body || init.form ? "POST" : "GET"),
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
      body: init.form ?? (init.body ? JSON.stringify(init.body) : undefined),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError(0, "offline", "Sem conexão. Verifique a internet e tente de novo.", {});
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth/")) {
      window.location.href = "/login?next=" + encodeURIComponent(location.pathname);
    }
    throw new ApiClientError(res.status, String(data.error ?? "erro"), String(data.message ?? "Algo deu errado. Tente novamente."), data);
  }
  return data as T;
}
