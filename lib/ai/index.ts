import type { AIProvider } from "./types";
import { GeminiProvider } from "./gemini";
import { OpenAICompatProvider } from "./openai-compat";

export type { AIProvider, ChannelEnrichment, ExtractedStatement } from "./types";

let cached: AIProvider | null = null;

// Returns the configured AI provider. Swap providers at deploy time via
// the AI_PROVIDER env var — no code changes needed downstream.
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const which = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  switch (which) {
    case "gemini":
      cached = new GeminiProvider();
      break;
    case "openai-compat":
    case "openai":
    case "groq":
    case "openrouter":
      cached = new OpenAICompatProvider();
      break;
    default:
      throw new Error(`Unknown AI_PROVIDER: ${which}`);
  }
  return cached;
}
