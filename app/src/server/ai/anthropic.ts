// Provedor Claude (Anthropic). Ativado com AI_PROVIDER=anthropic e ANTHROPIC_API_KEY.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { SYSTEM_PROMPT, userPrompt } from "./prompt";
import { AIUnavailableError, rawResultSchema, type AgendaAIService, type AgendaImage, type ExtractContext, type RawResult } from "./types";

export class AnthropicAgendaAI implements AgendaAIService {
  readonly name = "anthropic";
  private client = new Anthropic();
  private model = process.env.AI_MODEL || "claude-opus-5";

  async extractEventsFromImage(image: AgendaImage, ctx: ExtractContext): Promise<RawResult> {
    let message;
    try {
      message = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        // Se um classificador recusar a leitura, a API refaz a chamada no modelo de reserva recomendado.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: betaZodOutputFormat(rawResultSchema) },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: image.mimeType, data: image.data.toString("base64") } },
              {
                type: "text",
                text: userPrompt(ctx),
              },
            ],
          },
        ],
      });
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw new AIUnavailableError("Chave da IA inválida. Verifique ANTHROPIC_API_KEY.");
      if (err instanceof Anthropic.RateLimitError) throw new AIUnavailableError("A IA está ocupada agora. Tente novamente em instantes.");
      if (err instanceof Anthropic.APIError) throw new AIUnavailableError(`Falha ao consultar a IA (${err.status ?? "rede"}).`);
      throw err;
    }
    if (message.stop_reason === "refusal" || !message.parsed_output) {
      return { legivel: false, texto_lido: "", eventos: [] };
    }
    return message.parsed_output;
  }
}
