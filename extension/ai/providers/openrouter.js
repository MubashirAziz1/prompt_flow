import { createOpenAiCompatibleProvider } from "./openai-compatible.js";

export function createOpenRouterProvider() {
  return createOpenAiCompatibleProvider({
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "nvidia/nemotron-3.5-lightning:free",
    baseUrl: "https://openrouter.ai/api/v1",
    extraHeaders() {
      return {
        "HTTP-Referer": "https://prompt-enhancer.local",
        "X-OpenRouter-Title": "Prompt Enhancer",
      };
    },
  });
}
