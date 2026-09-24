// Provedor Claude (Anthropic). Ativado com AI_PROVIDER=anthropic e ANTHROPIC_API_KEY.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { dateLong } from "@/lib/dates";
import { AIUnavailableError, rawResultSchema, type AgendaAIService, type AgendaImage, type ExtractContext, type RawResult } from "./types";

const SYSTEM = [
  "Você lê fotos da agenda escolar de uma criança (anotações da professora) e extrai os compromissos para uma agenda digital da turma.",
  "",
  "Regras:",
  "- Extraia somente o que está escrito na foto. Se uma informação não aparece, devolva null (ou lista vazia). Nunca invente data, horário, local, valor ou materiais.",
  "- Cada compromisso distinto vira um item em \"eventos\" (uma mesma foto pode ter vários).",
  "- Datas: devolva AAAA-MM-DD. Quando a foto usar expressões relativas (\"amanhã\", \"próxima quarta-feira\", \"semana que vem\"), calcule a partir da data de referência informada, marque data_relativa = true e copie a expressão em data_texto_original. Datas sem ano (\"08/10\") usam o ano da data de referência, ou o seguinte se a data já tiver passado há mais de dois meses.",
  "- Autorização assinada conta como material e também marca autorizacao_necessaria = true.",
  "- A confiança (0 a 100) deve refletir a legibilidade da letra e a certeza da interpretação; seja conservador com letra difícil e datas relativas.",
  "- Se a imagem não for uma anotação escolar legível, devolva legivel = false e eventos vazio.",
].join("\n");

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
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: image.mimeType, data: image.data.toString("base64") } },
              {
                type: "text",
                text: `Data de referência (dia em que a foto foi tirada): ${ctx.referenceDate} (${dateLong(ctx.referenceDate)}). Extraia os compromissos desta página da agenda.`,
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
