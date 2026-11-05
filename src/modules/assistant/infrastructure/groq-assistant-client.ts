import { AssistantPort, AssistantChatInput, AssistantChatOutput } from '../application/ports/assistant-port';
import { ASSISTANT_SYSTEM_PROMPT, buildAssistantUserPrompt } from '../application/prompt-policy';
import { FallbackAssistantClient } from './fallback-assistant-client';
import { getServerConfig } from '../../../lib/config/env';

/** https://console.groq.com/docs/api-reference */
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 20_000;
// Reasoning models spend part of this on hidden reasoning before the answer.
const MAX_ANSWER_TOKENS = 2000;

export interface GroqAssistantClientOptions {
  apiKey?: string;
  model?: string;
  fallbackClient?: AssistantPort;
  fetchImpl?: typeof fetch;
}

/**
 * Writes the Assistant's explanation with Groq. The figures are already
 * calculated on the server; any failure falls back to the exact calculation,
 * so an LLM outage never blocks an answer.
 */
export class GroqAssistantClient implements AssistantPort {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly fallbackClient: AssistantPort;
  private readonly fetchImpl: typeof fetch;

  constructor(options?: GroqAssistantClientOptions) {
    const config = getServerConfig();
    this.apiKey = options && 'apiKey' in options ? options.apiKey : config.llmApiKey;
    this.model = options?.model || config.llmModel;
    this.fallbackClient = options?.fallbackClient || new FallbackAssistantClient();
    this.fetchImpl = options?.fetchImpl || fetch;
  }

  async generateResponse(input: AssistantChatInput): Promise<AssistantChatOutput> {
    // A key still holding the .env.example placeholder cannot work; skip the failing call.
    if (!this.apiKey || this.apiKey.startsWith('your-')) {
      return this.fallbackClient.generateResponse(input);
    }

    try {
      const response = await this.fetchImpl(GROQ_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          max_completion_tokens: MAX_ANSWER_TOKENS,
          messages: [
            { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
            { role: 'user', content: buildAssistantUserPrompt(input) },
          ],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`Groq answered HTTP ${response.status}`);

      const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const message = body.choices?.[0]?.message?.content?.trim();
      if (!message) throw new Error('Groq returned an empty answer');

      return {
        message,
        calculationContext: input.calculationContext,
        recalledMemories: input.recalledMemories.map((m) => ({ id: m.id, category: m.category, text: m.text })),
        memoryStatus: input.calculationContext.memoryStatus,
        isFallback: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Status only: the request holds the key and the user's finance context.
      console.warn(`Assistant LLM unavailable, using the calculated answer: ${error instanceof Error ? error.message : 'unknown error'}`);
      return this.fallbackClient.generateResponse(input);
    }
  }
}
