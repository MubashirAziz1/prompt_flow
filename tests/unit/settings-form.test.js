import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTIVE_PROVIDER_ID } from "../../extension/ai/provider-config.js";
import { bindSettingsForm } from "../../extension/settings/settings-form.js";
import { createProviderRegistry } from "../../extension/ai/providers/registry.js";
import { createSettingsStore } from "../../extension/ai/settings-store.js";
import { fakeControl } from "../helpers/fake-controls.js";
import { createMemoryStorage } from "../helpers/memory-storage.js";

async function bind(store, getActiveProvider) {
  const apiKeyInput = fakeControl();
  const saveButton = fakeControl();
  const statusElement = fakeControl();
  const providerLabel = fakeControl();
  const registry = createProviderRegistry();

  await bindSettingsForm({
    apiKeyInput,
    saveButton,
    statusElement,
    providerLabel,
    store,
    getActiveProvider: getActiveProvider ?? (() => registry.active()),
  });

  return {
    apiKeyInput,
    saveButton,
    statusElement,
    providerLabel,
  };
}

describe("settings form (unit)", () => {
  it("loads the API key for the active provider and shows its name", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });
    await store.save({
      apiKeys: { openai: "sk-saved", openrouter: "sk-or-saved" },
    });

    const form = await bind(store);

    assert.equal(form.apiKeyInput.value, "sk-saved");
    assert.match(form.providerLabel.textContent, /openai/i);
    assert.equal(ACTIVE_PROVIDER_ID, "openai");
  });

  it("saves only the active provider API key", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });
    await store.save({
      apiKeys: { openrouter: "sk-or" },
    });
    const form = await bind(store);

    form.apiKeyInput.value = "sk-new";
    await form.saveButton.listeners.click();

    const saved = await store.load();
    assert.equal(saved.apiKeys.openai, "sk-new");
    assert.equal(saved.apiKeys.openrouter, "sk-or");
    assert.equal(saved.systemPrompt, undefined);
    assert.equal(saved.models, undefined);
    assert.match(form.statusElement.textContent, /saved/i);
  });

  it("shows a save error when storage fails", async () => {
    const originalError = console.error;
    console.error = () => {};
    const store = {
      async load() {
        return { apiKeys: {} };
      },
      async save() {
        throw new Error("quota");
      },
    };

    try {
      const form = await bind(store);
      await form.saveButton.listeners.click();
      assert.match(form.statusElement.textContent, /could not save/i);
    } finally {
      console.error = originalError;
    }
  });
});
