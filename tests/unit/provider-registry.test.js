import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTIVE_PROVIDER_ID } from "../../extension/ai/provider-config.js";
import { AI_ERROR_CODES, AiError } from "../../extension/ai/errors.js";
import { createProviderRegistry } from "../../extension/ai/providers/registry.js";

describe("provider registry (unit)", () => {
  it("lists only OpenRouter without exposing complete() in the catalog", () => {
    const registry = createProviderRegistry();
    const catalog = registry.list();

    assert.deepEqual(
      catalog.map((provider) => provider.id),
      ["openrouter"]
    );
    assert.equal(catalog[0].label, "OpenRouter");
    assert.equal(typeof catalog[0].defaultModel, "string");
    assert.ok(catalog[0].defaultModel.length > 0);
    assert.equal(catalog[0].complete, undefined);
  });

  it("resolves the active provider from config so OpenRouter is the only vendor", () => {
    const registry = createProviderRegistry();
    const active = registry.active();

    assert.equal(ACTIVE_PROVIDER_ID, "openrouter");
    assert.equal(active.id, "openrouter");
    assert.equal(active.id, ACTIVE_PROVIDER_ID);
    assert.equal(typeof active.complete, "function");
    assert.equal(typeof active.defaultModel, "string");
    assert.ok(active.defaultModel.length > 0);
  });

  it("returns the OpenRouter implementation by id", () => {
    const registry = createProviderRegistry();
    const openrouter = registry.get("openrouter");

    assert.equal(openrouter.id, "openrouter");
    assert.equal(typeof openrouter.complete, "function");
  });

  it("throws a provider error for OpenAI and other unknown ids", () => {
    const registry = createProviderRegistry();

    for (const id of ["openai", "anthropic"]) {
      try {
        registry.get(id);
        assert.fail(`expected unknown provider ${id} to throw`);
      } catch (error) {
        assert.ok(error instanceof AiError);
        assert.equal(error.code, AI_ERROR_CODES.PROVIDER);
      }
    }
  });
});
