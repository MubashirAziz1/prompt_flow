import { AI_ERROR_CODES, AiError } from "../errors.js";
import { ACTIVE_PROVIDER_ID } from "../provider-config.js";
import { createOpenAiProvider } from "./openai.js";
import { createOpenRouterProvider } from "./openrouter.js";

export function createProviderRegistry() {
  const providers = [createOpenAiProvider(), createOpenRouterProvider()];
  const byId = new Map(providers.map((provider) => [provider.id, provider]));

  return {
    list() {
      return providers.map(({ id, label, defaultModel }) => ({
        id,
        label,
        defaultModel,
      }));
    },
    active() {
      return this.get(ACTIVE_PROVIDER_ID);
    },
    get(id) {
      const provider = byId.get(id);
      if (!provider) {
        throw new AiError(
          AI_ERROR_CODES.PROVIDER,
          `Unknown AI provider: ${id}`
        );
      }
      return provider;
    },
  };
}
