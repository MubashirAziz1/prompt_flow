import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAiEngine } from "../../extension/ai/engine.js";
import { createProviderRegistry } from "../../extension/ai/providers/registry.js";
import { createSettingsStore } from "../../extension/ai/settings-store.js";
import { bindEnhanceFlow } from "../../extension/sidepanel/enhance-flow.js";
import { chatCompletionResponse, createFakeFetch } from "../helpers/fake-fetch.js";
import { fakeControl } from "../helpers/fake-controls.js";
import { createMemoryStorage } from "../helpers/memory-storage.js";

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("enhance flow (unit)", () => {
  it("writes the model response to the output area", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });
    await store.save({
      providerId: "openai",
      apiKeys: { openai: "sk-test" },
    });
    const fetchImpl = createFakeFetch(() =>
      chatCompletionResponse("polished prompt")
    );
    const engine = createAiEngine({
      loadSettings: () => store.load(),
      registry: createProviderRegistry(),
    });
    const promptInput = fakeControl("  draft this  ");
    const actionButton = fakeControl();
    const outputElement = fakeControl();
    const statusElement = fakeControl();

    bindEnhanceFlow({
      promptInput,
      actionButton,
      outputElement,
      statusElement,
      engine,
      fetchImpl,
    });

    const pending = actionButton.listeners.click();
    assert.equal(actionButton.disabled, true);
    assert.match(statusElement.textContent, /working/i);
    await pending;
    await flush();

    assert.equal(outputElement.value, "polished prompt");
    assert.equal(statusElement.textContent, "");
    assert.equal(actionButton.disabled, false);
  });

  it("shows a missing-key error in the status area and leaves output empty", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });
    const engine = createAiEngine({
      loadSettings: () => store.load(),
      registry: createProviderRegistry(),
    });
    const promptInput = fakeControl("hello");
    const actionButton = fakeControl();
    const outputElement = fakeControl("old");
    const statusElement = fakeControl();

    bindEnhanceFlow({
      promptInput,
      actionButton,
      outputElement,
      statusElement,
      engine,
      fetchImpl: createFakeFetch(() => chatCompletionResponse("nope")),
    });

    await actionButton.listeners.click();
    await flush();

    assert.equal(outputElement.value, "");
    assert.match(statusElement.textContent, /api key/i);
    assert.equal(actionButton.disabled, false);
  });
});
