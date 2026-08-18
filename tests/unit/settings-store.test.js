import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SETTINGS_STORAGE_KEY,
  createChromeStorageAdapter,
  createSettingsStore,
} from "../../extension/ai/settings-store.js";
import {
  createMemoryChromeStorage,
  createMemoryStorage,
} from "../helpers/memory-storage.js";

describe("settings store (unit)", () => {
  it("returns immutable defaults when storage is empty", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });
    const settings = await store.load();

    assert.deepEqual(settings.apiKeys, {});
    assert.equal(settings.systemPrompt, undefined);
    assert.equal(settings.models, undefined);
  });

  it("saves per-provider API keys locally and ignores model or system prompt fields", async () => {
    const storage = createMemoryStorage();
    const store = createSettingsStore({ storage });

    const saved = await store.save({
      providerId: "openrouter",
      apiKeys: { openrouter: "  sk-or-test  " },
      models: { openrouter: "openai/gpt-4o-mini" },
      systemPrompt: "Stay concise.",
    });

    assert.equal(saved.apiKeys.openrouter, "sk-or-test");
    assert.equal(saved.systemPrompt, undefined);
    assert.equal(saved.models, undefined);
    assert.equal(saved.providerId, undefined);
    assert.deepEqual(storage.snapshot()[SETTINGS_STORAGE_KEY], saved);
  });

  it("merges updates without dropping another stored key", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });

    await store.save({
      apiKeys: { other: "sk-other", openrouter: "sk-or" },
    });

    const saved = await store.save({
      apiKeys: { openrouter: "sk-or-new" },
    });

    assert.equal(saved.apiKeys.other, "sk-other");
    assert.equal(saved.apiKeys.openrouter, "sk-or-new");
  });

  it("clears a provider key when the saved value is blank", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });
    await store.save({
      apiKeys: { other: "sk-keep", openrouter: "sk-or" },
    });

    const saved = await store.save({
      apiKeys: { openrouter: "   " },
    });

    assert.equal(saved.apiKeys.other, "sk-keep");
    assert.equal(saved.apiKeys.openrouter, undefined);
  });

  it("does not write API keys to a remote backend field", async () => {
    const storage = createMemoryStorage();
    const store = createSettingsStore({ storage });

    const saved = await store.save({
      apiKeys: { openrouter: "sk-local-only" },
    });

    assert.equal(saved.backend, undefined);
    assert.equal(storage.snapshot().backend, undefined);
  });

  it("reads and writes through chrome.storage.local", async () => {
    const chromeStorage = createMemoryChromeStorage();
    const store = createSettingsStore({
      storage: createChromeStorageAdapter(chromeStorage),
    });

    await store.save({
      apiKeys: { openrouter: "sk-chrome" },
    });

    const loaded = await store.load();
    assert.equal(loaded.apiKeys.openrouter, "sk-chrome");
    assert.equal(
      chromeStorage.snapshot()[SETTINGS_STORAGE_KEY].apiKeys.openrouter,
      "sk-chrome"
    );
  });
});
