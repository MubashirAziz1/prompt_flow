import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAiEngine } from "../../extension/ai/engine.js";
import { AI_ERROR_CODES, AiError } from "../../extension/ai/errors.js";
import { createProviderRegistry } from "../../extension/ai/providers/registry.js";
import { createSettingsStore } from "../../extension/ai/settings-store.js";
import { DEFAULT_SYSTEM_PROMPT } from "../../extension/ai/system-prompt.js";
import { chatCompletionResponse, createFakeFetch } from "../helpers/fake-fetch.js";
import { createMemoryStorage } from "../helpers/memory-storage.js";

function expectedMessages(userPrompt, systemPrompt = DEFAULT_SYSTEM_PROMPT) {
  const trimmed = String(systemPrompt ?? "").trim();
  const messages = [];
  if (trimmed) {
    messages.push({ role: "system", content: trimmed });
  }
  messages.push({ role: "user", content: userPrompt });
  return messages;
}

describe("AI engine (unit)", () => {
  it("uses the active provider default model and developer system prompt", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });
    await store.save({
      apiKeys: { openai: "sk-test" },
    });

    const fetchImpl = createFakeFetch(() =>
      chatCompletionResponse("a clearer prompt")
    );
    const engine = createAiEngine({
      loadSettings: () => store.load(),
      registry: createProviderRegistry(),
    });

    const result = await engine.complete({
      userPrompt: "write email",
      fetchImpl,
    });

    assert.equal(result.text, "a clearer prompt");
    assert.equal(
      fetchImpl.calls[0].url,
      "https://api.openai.com/v1/chat/completions"
    );
    assert.deepEqual(JSON.parse(fetchImpl.calls[0].init.body), {
      model: "gpt-4o-mini",
      messages: expectedMessages("write email"),
    });
  });

  it("ignores user-stored provider, model, and system prompt values", async () => {
    const fetchImpl = createFakeFetch(() => chatCompletionResponse("ok"));
    const engine = createAiEngine({
      loadSettings: async () => ({
        providerId: "openrouter",
        apiKeys: { openai: "sk-test", openrouter: "sk-or-test" },
        models: { openai: "gpt-user-model" },
        systemPrompt: "User override. Keep the meaning.",
      }),
      registry: createProviderRegistry(),
    });

    await engine.complete({ userPrompt: "hello", fetchImpl });

    assert.equal(
      fetchImpl.calls[0].url,
      "https://api.openai.com/v1/chat/completions"
    );
    assert.deepEqual(JSON.parse(fetchImpl.calls[0].init.body), {
      model: "gpt-4o-mini",
      messages: expectedMessages("hello"),
    });
    assert.doesNotMatch(fetchImpl.calls[0].init.body, /User override/);
  });

  it("includes a developer-provided system prompt for every request", async () => {
    const fetchImpl = createFakeFetch(() => chatCompletionResponse("ok"));
    const engine = createAiEngine({
      loadSettings: async () => ({ apiKeys: { openai: "sk-test" } }),
      registry: createProviderRegistry(),
      systemPrompt: "Stay concise.",
    });

    await engine.complete({ userPrompt: "hello", fetchImpl });

    assert.deepEqual(JSON.parse(fetchImpl.calls[0].init.body).messages, [
      { role: "system", content: "Stay concise." },
      { role: "user", content: "hello" },
    ]);
  });

  it("can switch providers through engine config without changing the UI", async () => {
    const fetchImpl = createFakeFetch(() => chatCompletionResponse("ok"));
    const engine = createAiEngine({
      loadSettings: async () => ({
        apiKeys: { openrouter: "sk-or-test" },
      }),
      registry: createProviderRegistry(),
      activeProviderId: "openrouter",
    });

    await engine.complete({ userPrompt: "hello", fetchImpl });

    assert.equal(
      fetchImpl.calls[0].url,
      "https://openrouter.ai/api/v1/chat/completions"
    );
    assert.equal(
      JSON.parse(fetchImpl.calls[0].init.body).model,
      "openai/gpt-4o-mini"
    );
  });

  it("fails when the active provider has no model configured", async () => {
    const engine = createAiEngine({
      loadSettings: async () => ({
        apiKeys: { blank: "sk-test" },
      }),
      activeProviderId: "blank",
      registry: {
        get() {
          return {
            id: "blank",
            defaultModel: "  ",
            complete: async () => ({ text: "nope" }),
          };
        },
      },
    });

    try {
      await engine.complete({ userPrompt: "hello" });
      assert.fail("expected a model error");
    } catch (error) {
      assert.ok(error instanceof AiError);
      assert.equal(error.code, AI_ERROR_CODES.MODEL);
    }
  });

  it("fails with a missing-key error before calling a provider", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });
    const fetchImpl = createFakeFetch(() => chatCompletionResponse("ok"));
    const engine = createAiEngine({
      loadSettings: () => store.load(),
      registry: createProviderRegistry(),
    });

    try {
      await engine.complete({ userPrompt: "hello", fetchImpl });
      assert.fail("expected missing key to throw");
    } catch (error) {
      assert.ok(error instanceof AiError);
      assert.equal(error.code, AI_ERROR_CODES.MISSING_API_KEY);
      assert.equal(fetchImpl.calls.length, 0);
    }
  });
});
