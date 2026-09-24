import { AnthropicAgendaAI } from "./anthropic";
import { GeminiAgendaAI } from "./gemini";
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
 * - "gemini" + GEMINI_API_KEY → Google Gemini (tem plano gratuito).
 * - "mock" → respostas de exemplo (só quando pedido explicitamente).
 * - Sem configuração válida: mock em desenvolvimento; em produção, indisponível — o mock
 *   devolve eventos fictícios e nunca pode chegar às famílias por engano.
 */
export function getAgendaAI(): AgendaAIService {
  if (instance) return instance;
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  if (provider === "anthropic" && (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)) instance = new AnthropicAgendaAI();
  else if (provider === "gemini" && process.env.GEMINI_API_KEY) instance = new GeminiAgendaAI();
  else if (provider === "mock") instance = new MockAgendaAI();
  else if (process.env.NODE_ENV === "production") {
    console.warn(`[ia] Provedor de IA não configurado (AI_PROVIDER=${provider || "vazio"} sem a chave correspondente). Leitura por foto desativada.`);
    instance = unavailable;
  } else instance = new MockAgendaAI();
  return instance;
}

export function setAgendaAI(s: AgendaAIService | null) {
  instance = s;
}
