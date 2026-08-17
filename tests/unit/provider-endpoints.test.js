import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOpenAiProvider } from "../../extension/ai/providers/openai.js";
import { createOpenRouterProvider } from "../../extension/ai/providers/openrouter.js";
import { chatCompletionResponse, createFakeFetch } from "../helpers/fake-fetch.js";

describe("provider endpoints (unit)", () => {
  it("sends OpenAI requests only to api.openai.com", async () => {
    const fetchImpl = createFakeFetch(() => chatCompletionResponse("ok"));
    const openai = createOpenAiProvider();

    await openai.complete({
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
    });

    assert.equal(
      fetchImpl.calls[0].url,
      "https://api.openai.com/v1/chat/completions"
    );
    assert.equal(openai.defaultModel, "gpt-4o-mini");
  });

  it("sends OpenRouter requests only to openrouter.ai with attribution headers", async () => {
    const fetchImpl = createFakeFetch(() => chatCompletionResponse("ok"));
    const openrouter = createOpenRouterProvider();

    await openrouter.complete({
      apiKey: "sk-or-test",
      model: "openai/gpt-4o-mini",
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
    assert.equal(openrouter.defaultModel, "openai/gpt-4o-mini");
  });
});
