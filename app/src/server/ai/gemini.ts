// Provedor Google Gemini. Ativado com AI_PROVIDER=gemini e GEMINI_API_KEY (chave do Google AI Studio).
// Usa a API REST diretamente (sem SDK). O plano gratuito tem limite diário de chamadas e o Google
// pode usar o conteúdo enviado para melhorar os produtos dele — veja DEPLOY.md.
import { z } from "zod";
import { SYSTEM_PROMPT, userPrompt } from "./prompt";
import { AIUnavailableError, rawResultSchema, type AgendaAIService, type AgendaImage, type ExtractContext, type RawResult } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// JSON Schema da resposta, gerado do mesmo schema zod que valida o resultado.
const { $schema: _ignored, ...RESPONSE_SCHEMA } = z.toJSONSchema(rawResultSchema) as Record<string, unknown>;

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code: number; message: string; status: string };
};

export class GeminiAgendaAI implements AgendaAIService {
  readonly name = "gemini";
  private key = process.env.GEMINI_API_KEY ?? "";
  private model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  private async call(image: AgendaImage, ctx: ExtractContext, withSchema: boolean) {
    const res = await fetch(`${BASE}/${encodeURIComponent(this.model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: image.mimeType, data: image.data.toString("base64") } }, { text: userPrompt(ctx) }],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          ...(withSchema ? { responseJsonSchema: RESPONSE_SCHEMA } : {}),
        },
      }),
      signal: AbortSignal.timeout(90_000),
    });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as GeminiResponse };
  }

  async extractEventsFromImage(image: AgendaImage, ctx: ExtractContext): Promise<RawResult> {
    let r;
    try {
      r = await this.call(image, ctx, true);
      // Se o modelo não aceitar o schema, tenta de novo pedindo só JSON; o zod valida depois.
      if (r.status === 400 && /schema/i.test(r.body.error?.message ?? "")) r = await this.call(image, ctx, false);
    } catch (err) {
      console.error("[ia] Falha de rede ao chamar o Gemini:", err);
      throw new AIUnavailableError("Não foi possível falar com a IA agora. Tente novamente em instantes.");
    }

    if (r.status !== 200) console.error(`[ia] Gemini respondeu ${r.status} (modelo ${this.model}):`, r.body.error?.status, r.body.error?.message);
    if (r.status === 429) throw new AIUnavailableError("O limite gratuito de leituras por foto foi atingido. Tente mais tarde ou preencha manualmente.");
    if (r.status === 404) throw new AIUnavailableError(`O modelo de IA "${this.model}" não está disponível para esta chave.`);
    if (r.status === 400 || r.status === 401 || r.status === 403) {
      const why = /api key|API_KEY/i.test(r.body.error?.message ?? "") ? "a chave do Gemini foi recusada" : "o Gemini recusou o pedido";
      throw new AIUnavailableError(`Leitura por foto indisponível: ${why} (erro ${r.status}).`);
    }
    if (r.status >= 500 || !r.body.candidates) {
      if (r.body.promptFeedback?.blockReason) return { legivel: false, texto_lido: "", eventos: [] };
      throw new AIUnavailableError(`Falha ao consultar a IA (${r.status}).`);
    }

    const text = r.body.candidates[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    try {
      return rawResultSchema.parse(JSON.parse(text));
    } catch (err) {
      console.error("[ia] resposta do Gemini fora do formato", err);
      return { legivel: false, texto_lido: "", eventos: [] };
    }
  }
}
