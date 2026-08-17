import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTIVE_PROVIDER_ID } from "../../extension/ai/provider-config.js";
import { AI_ERROR_CODES, AiError } from "../../extension/ai/errors.js";
import { createProviderRegistry } from "../../extension/ai/providers/registry.js";

describe("provider registry (unit)", () => {
  it("lists OpenAI and OpenRouter without exposing complete() in the catalog", () => {
    const registry = createProviderRegistry();
    const catalog = registry.list();

    assert.deepEqual(
      catalog.map((provider) => provider.id),
      ["openai", "openrouter"]
    );
    assert.equal(catalog[0].label, "OpenAI");
    assert.equal(catalog[1].label, "OpenRouter");
    assert.equal(typeof catalog[0].defaultModel, "string");
    assert.ok(catalog[0].defaultModel.length > 0);
    assert.equal(typeof catalog[1].defaultModel, "string");
    assert.ok(catalog[1].defaultModel.length > 0);
    assert.equal(catalog[0].complete, undefined);
    assert.notEqual(catalog[0].defaultModel, catalog[1].defaultModel);
  });

  it("resolves the active provider from config so vendors can be switched later", () => {
    const registry = createProviderRegistry();
    const active = registry.active();

    assert.equal(active.id, ACTIVE_PROVIDER_ID);
    assert.equal(typeof active.complete, "function");
    assert.equal(typeof active.defaultModel, "string");
    assert.ok(active.defaultModel.length > 0);
  });

  it("returns a provider implementation by id", () => {
    const registry = createProviderRegistry();
    const openai = registry.get("openai");
    const openrouter = registry.get("openrouter");

    assert.equal(openai.id, "openai");
    assert.equal(typeof openai.complete, "function");
    assert.equal(openrouter.id, "openrouter");
    assert.equal(typeof openrouter.complete, "function");
  });

  it("throws a provider error for an unknown id", () => {
    const registry = createProviderRegistry();

    try {
      registry.get("anthropic");
      assert.fail("expected unknown provider to throw");
    } catch (error) {
      assert.ok(error instanceof AiError);
      assert.equal(error.code, AI_ERROR_CODES.PROVIDER);
    }
  });
});
