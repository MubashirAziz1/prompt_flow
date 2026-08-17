import { createOpenAiCompatibleProvider } from "./openai-compatible.js";

export function createOpenAiProvider() {
  return createOpenAiCompatibleProvider({
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
  });
}
