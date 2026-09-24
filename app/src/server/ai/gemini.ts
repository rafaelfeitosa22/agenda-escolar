// Provedor Google Gemini. Ativado com AI_PROVIDER=gemini e GEMINI_API_KEY (chave do Google AI Studio).
// Usa a API REST diretamente (sem SDK). O plano gratuito tem limite diário de chamadas e o Google
// pode usar o conteúdo enviado para melhorar os produtos dele — veja DEPLOY.md.
//
// O plano gratuito às vezes responde 503 (modelo sobrecarregado) por longos períodos, e o Google
// aposenta modelos com frequência (404). Por isso, além de tentar de novo, o provedor consulta a
// lista de modelos liberados para a chave e passa para outro modelo "flash" quando o configurado falha.
import { z } from "zod";
import { SYSTEM_PROMPT, userPrompt } from "./prompt";
import { AIUnavailableError, rawResultSchema, type AgendaAIService, type AgendaImage, type ExtractContext, type RawResult } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

// JSON Schema da resposta, gerado do mesmo schema zod que valida o resultado.
const { $schema: _ignored, ...RESPONSE_SCHEMA } = z.toJSONSchema(rawResultSchema) as Record<string, unknown>;

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code: number; message: string; status: string };
};
type Call = { status: number; body: GeminiResponse };

const MAX_MODELS = 4;
const RETRY_WAIT_MS = [0, 1500, 4000];

/** Ordena modelos "flash" do mais novo para o mais antigo (ex.: 3.6-flash antes de 3.5-flash-lite). */
export function rankFlashModels(names: string[]): string[] {
  const version = (n: string) => Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  return names
    .filter((n) => /^gemini-[\d.]+-flash/.test(n) && !/(image|tts|audio|live|embed|thinking-exp|native)/.test(n))
    .sort((a, b) => version(b) - version(a) || Number(/lite/.test(a)) - Number(/lite/.test(b)) || a.length - b.length);
}

export class GeminiAgendaAI implements AgendaAIService {
  readonly name = "gemini";
  private key = process.env.GEMINI_API_KEY ?? "";
  private model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  private available: Promise<string[]> | null = null;

  private headers() {
    return { "Content-Type": "application/json", "x-goog-api-key": this.key };
  }

  private async call(model: string, image: AgendaImage, ctx: ExtractContext, withSchema: boolean): Promise<Call> {
    const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: this.headers(),
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
      signal: AbortSignal.timeout(35_000),
    });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as GeminiResponse };
  }

  /** Modelos "flash" que esta chave pode usar para generateContent (consultado uma vez por instância). */
  private listModels(): Promise<string[]> {
    this.available ??= fetch(`${BASE}/models?pageSize=200`, { headers: this.headers(), signal: AbortSignal.timeout(10_000) })
      .then((r) => r.json())
      .then((j: { models?: { name: string; supportedGenerationMethods?: string[] }[] }) =>
        rankFlashModels((j.models ?? []).filter((m) => m.supportedGenerationMethods?.includes("generateContent")).map((m) => m.name.replace(/^models\//, ""))),
      )
      .catch((err) => {
        console.error("[ia] Não foi possível listar os modelos do Gemini:", err);
        this.available = null;
        return [];
      });
    return this.available;
  }

  /** Tenta um modelo, repetindo em erros passageiros (503/5xx/429/rede). */
  private async tryModel(model: string, image: AgendaImage, ctx: ExtractContext, retries: number): Promise<Call | null> {
    let withSchema = true;
    let last: Call | null = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      if (RETRY_WAIT_MS[attempt]) await new Promise((res) => setTimeout(res, RETRY_WAIT_MS[attempt]));
      try {
        last = await this.call(model, image, ctx, withSchema);
      } catch (err) {
        console.error(`[ia] Falha de rede com ${model} (tentativa ${attempt + 1}):`, err);
        continue;
      }
      // Se o modelo não aceitar o schema, repete pedindo só JSON; o zod valida depois.
      if (last.status === 400 && withSchema && /schema/i.test(last.body.error?.message ?? "")) {
        withSchema = false;
        attempt--;
        continue;
      }
      if (last.status !== 200) console.error(`[ia] Gemini ${model} respondeu ${last.status} (tentativa ${attempt + 1}):`, last.body.error?.status, last.body.error?.message);
      if (last.status === 200 || !(last.status === 429 || last.status >= 500)) return last;
    }
    return last;
  }

  async extractEventsFromImage(image: AgendaImage, ctx: ExtractContext): Promise<RawResult> {
    const tried: string[] = [];
    let r: Call | null = await this.tryModel(this.model, image, ctx, RETRY_WAIT_MS.length);
    tried.push(this.model);

    // Modelo sobrecarregado (5xx) ou aposentado (404): passa para outros modelos "flash" liberados.
    if (!r || r.status >= 500 || r.status === 404) {
      for (const alt of (await this.listModels()).filter((m) => m !== this.model).slice(0, MAX_MODELS - 1)) {
        const next = await this.tryModel(alt, image, ctx, 1);
        tried.push(alt);
        if (next) r = next;
        if (next && (next.status === 200 || next.status === 429 || (next.status >= 400 && next.status < 500 && next.status !== 404))) break;
      }
      if (r?.status === 200 && tried.length > 1) console.warn(`[ia] Leitura feita com o modelo alternativo ${tried[tried.length - 1]} (${this.model} indisponível). Considere trocar GEMINI_MODEL.`);
    }

    if (!r) throw new AIUnavailableError("Não foi possível falar com a IA agora. Tente novamente em instantes.");
    if (r.status === 429) throw new AIUnavailableError("O limite gratuito de leituras por foto foi atingido. Tente mais tarde ou preencha manualmente.");
    if (r.status >= 500) throw new AIUnavailableError("A IA do Google está sobrecarregada agora. Tente de novo em alguns minutos ou preencha manualmente.");
    if (r.status === 404) throw new AIUnavailableError(`Nenhum modelo de IA disponível para esta chave (tentados: ${tried.join(", ")}).`);
    if (r.status === 400 || r.status === 401 || r.status === 403) {
      const why = /api key|API_KEY/i.test(r.body.error?.message ?? "") ? "a chave do Gemini foi recusada" : "o Gemini recusou o pedido";
      throw new AIUnavailableError(`Leitura por foto indisponível: ${why} (erro ${r.status}).`);
    }
    if (!r.body.candidates) {
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
