import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOpenRouterProvider } from "../../extension/ai/providers/openrouter.js";
import { chatCompletionResponse, createFakeFetch } from "../helpers/fake-fetch.js";

describe("provider endpoints (unit)", () => {
  it("sends OpenRouter requests only to openrouter.ai with attribution headers", async () => {
    const fetchImpl = createFakeFetch(() => chatCompletionResponse("ok"));
    const openrouter = createOpenRouterProvider();

    await openrouter.complete({
      apiKey: "sk-or-test",
      model: openrouter.defaultModel,
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
    });

    assert.equal(
      fetchImpl.calls[0].url,
      "https://openrouter.ai/api/v1/chat/completions"
    );
    assert.equal(
      fetchImpl.calls[0].init.headers["X-OpenRouter-Title"],
      "Prompt Enhancer"
    );
    assert.equal(typeof fetchImpl.calls[0].init.headers["HTTP-Referer"], "string");
    assert.ok(fetchImpl.calls[0].init.headers["HTTP-Referer"].length > 0);
    assert.equal(openrouter.defaultModel, "nvidia/nemotron-3.5-lightning:free");
    assert.doesNotMatch(fetchImpl.calls[0].url, /api\.openai\.com/);
  });
});
