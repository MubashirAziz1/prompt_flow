import { createOpenAiCompatibleProvider } from "./openai-compatible.js";

export function createOpenRouterProvider() {
  return createOpenAiCompatibleProvider({
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "openai/gpt-4o-mini",
    baseUrl: "https://openrouter.ai/api/v1",
    extraHeaders() {
      return {
        "HTTP-Referer": "https://prompt-enhancer.local",
        "X-OpenRouter-Title": "Prompt Enhancer",
      };
    },
  });
}
