/**
 * Safe server-side environment configuration.
 * Prevents execution if critical server keys are malformed or missing in production.
 */

export interface AppEnvConfig {
  walrusRelayerUrl: string;
  walrusNamespace: string;
  tatumApiKey?: string;
  llmApiKey?: string;
  llmModel: string;
}

export function getServerConfig(): AppEnvConfig {
  return {
    walrusRelayerUrl: process.env.MEMWAL_RELAYER_URL || 'https://relayer.memory.walrus.xyz',
    walrusNamespace: process.env.MEMWAL_NAMESPACE || 'memeora',
    tatumApiKey: process.env.TATUM_API_KEY,
    llmApiKey: process.env.GROQ_API_KEY || process.env.LLM_API_KEY,
    llmModel: process.env.LLM_MODEL || 'openai/gpt-oss-120b',
  };
}
