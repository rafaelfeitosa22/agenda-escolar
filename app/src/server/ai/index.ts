import { AnthropicAgendaAI } from "./anthropic";
import { MockAgendaAI } from "./mock";
import { AIUnavailableError, type AgendaAIService } from "./types";

let instance: AgendaAIService | null = null;

/** Provedor usado quando não há IA configurada em produção: falha de forma clara em vez de inventar dados. */
const unavailable: AgendaAIService = {
  name: "indisponivel",
  async extractEventsFromImage() {
    throw new AIUnavailableError("A leitura por foto ainda não está disponível. Use Preencher manualmente.");
  },
};

/**
 * Escolhe o provedor pela variável AI_PROVIDER.
 * - "anthropic" + ANTHROPIC_API_KEY → Claude.
 * - "mock" → respostas de exemplo (só quando pedido explicitamente).
 * - Sem configuração: mock em desenvolvimento; em produção, indisponível — o mock
 *   devolve eventos fictícios e nunca pode chegar às famílias por engano.
 */
export function getAgendaAI(): AgendaAIService {
  if (instance) return instance;
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (provider === "anthropic" && hasKey) instance = new AnthropicAgendaAI();
  else if (provider === "mock") instance = new MockAgendaAI();
  else if (process.env.NODE_ENV === "production") {
    console.warn("[ia] Nenhum provedor de IA configurado (AI_PROVIDER=anthropic + ANTHROPIC_API_KEY). Leitura por foto desativada.");
    instance = unavailable;
  } else instance = new MockAgendaAI();
  return instance;
}

export function setAgendaAI(s: AgendaAIService | null) {
  instance = s;
}
