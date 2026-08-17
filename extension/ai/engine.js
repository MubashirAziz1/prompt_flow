import { AI_ERROR_CODES, AiError } from "./errors.js";
import { ACTIVE_PROVIDER_ID } from "./provider-config.js";
import { DEFAULT_SYSTEM_PROMPT } from "./system-prompt.js";

export function createAiEngine({
  loadSettings,
  registry,
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
  activeProviderId = ACTIVE_PROVIDER_ID,
} = {}) {
  return {
    async complete({ userPrompt, fetchImpl }) {
      const settings = await loadSettings();
      const provider = registry.get(activeProviderId);
      const apiKey = String(settings.apiKeys?.[provider.id] ?? "").trim();

      if (!apiKey) {
        throw new AiError(
          AI_ERROR_CODES.MISSING_API_KEY,
          "Add an API key in Settings before enhancing a prompt."
        );
      }

      const model = String(provider.defaultModel ?? "").trim();

      if (!model) {
        throw new AiError(
          AI_ERROR_CODES.MODEL,
          "The active AI provider has no model configured."
        );
      }

      const messages = [];
      const trimmedSystemPrompt = String(systemPrompt ?? "").trim();

      if (trimmedSystemPrompt) {
        messages.push({ role: "system", content: trimmedSystemPrompt });
      }

      messages.push({ role: "user", content: userPrompt });

      return provider.complete({
        apiKey,
        model,
        messages,
        fetchImpl,
      });
    },
  };
}
