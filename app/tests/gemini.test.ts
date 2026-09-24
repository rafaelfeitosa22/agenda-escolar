import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiAgendaAI, rankFlashModels } from "@/server/ai/gemini";
import { mockResult } from "@/server/ai/mock";
import { AIUnavailableError } from "@/server/ai/types";

const image = { data: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), mimeType: "image/jpeg" as const };
const ctx = { referenceDate: "2026-09-23" };
const ok = (payload: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }), { status: 200 });

afterEach(() => vi.unstubAllGlobals());

describe("provedor Gemini", () => {
  it("envia a imagem e o schema, e devolve o resultado validado", async () => {
    const fetchMock = vi.fn(async () => ok(mockResult("single", "2026-09-23")));
    vi.stubGlobal("fetch", fetchMock);
    const r = await new GeminiAgendaAI().extractEventsFromImage(image, ctx);
    expect(r.eventos[0].titulo).toBe("Passeio ao Zoológico");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(":generateContent");
    const body = JSON.parse(init.body as string);
    expect(body.contents[0].parts[0].inlineData.mimeType).toBe("image/jpeg");
    expect(body.generationConfig.responseJsonSchema.properties.eventos).toBeDefined();
    expect(body.systemInstruction.parts[0].text).toContain("Nunca invente");
  });

  it("se o schema for recusado, tenta de novo só com JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 400, message: "Invalid JSON schema", status: "INVALID_ARGUMENT" } }), { status: 400 }))
      .mockResolvedValueOnce(ok(mockResult("relativa", "2026-09-23")));
    vi.stubGlobal("fetch", fetchMock);
    const r = await new GeminiAgendaAI().extractEventsFromImage(image, ctx);
    expect(r.eventos[0].data_relativa).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).generationConfig.responseJsonSchema).toBeUndefined();
  });

  it("503 (modelo sobrecarregado) é tentado de novo e pode dar certo", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 503, message: "The model is overloaded", status: "UNAVAILABLE" } }), { status: 503 }))
      .mockResolvedValueOnce(ok(mockResult("single", "2026-09-23")));
    vi.stubGlobal("fetch", fetchMock);
    const r = await new GeminiAgendaAI().extractEventsFromImage(image, ctx);
    expect(r.eventos[0].titulo).toBe("Passeio ao Zoológico");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("503 persistente vira mensagem de IA sobrecarregada", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    await expect(new GeminiAgendaAI().extractEventsFromImage(image, ctx)).rejects.toThrow(/sobrecarregada/);
  });

  it("modelo sobrecarregado: passa para outro modelo flash liberado para a chave", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url.replace(/^.*\/v1beta\//, ""));
        if (url.endsWith("/models?pageSize=200")) {
          return new Response(JSON.stringify({ models: [
            { name: "models/gemini-3.6-flash", supportedGenerationMethods: ["generateContent"] },
            { name: "models/gemini-3.6-flash-lite", supportedGenerationMethods: ["generateContent"] },
            { name: "models/gemini-3.6-flash-image", supportedGenerationMethods: ["generateContent"] },
            { name: "models/text-embedding-9", supportedGenerationMethods: ["embedContent"] },
          ] }), { status: 200 });
        }
        if (url.includes("gemini-3.6-flash-lite:")) return ok(mockResult("single", "2026-09-23"));
        return new Response(JSON.stringify({ error: { code: 503, message: "overloaded", status: "UNAVAILABLE" } }), { status: 503 });
      }),
    );
    const r = await new GeminiAgendaAI().extractEventsFromImage(image, ctx);
    expect(r.eventos[0].titulo).toBe("Passeio ao Zoológico");
    expect(calls.filter((c) => c.startsWith("models/gemini-3.6-flash:")).length).toBe(3);
    expect(calls.some((c) => c.includes("flash-image"))).toBe(false);
  });

  it("ordena os modelos flash do mais novo para o mais antigo, ignorando os especiais", () => {
    expect(rankFlashModels(["gemini-2.5-flash", "gemini-3.6-flash-lite", "gemini-3.6-flash", "gemini-3.6-flash-tts", "gemini-3.5-pro"])).toEqual([
      "gemini-3.6-flash",
      "gemini-3.6-flash-lite",
      "gemini-2.5-flash",
    ]);
  });

  it("limite gratuito atingido vira erro tratável, não evento inventado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 429 })));
    await expect(new GeminiAgendaAI().extractEventsFromImage(image, ctx)).rejects.toBeInstanceOf(AIUnavailableError);
  });

  it("resposta fora do formato é tratada como foto ilegível", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok({ qualquer: "coisa" })));
    const r = await new GeminiAgendaAI().extractEventsFromImage(image, ctx);
    expect(r).toEqual({ legivel: false, texto_lido: "", eventos: [] });
  });
});
