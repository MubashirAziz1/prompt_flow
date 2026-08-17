import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AI_ERROR_CODES, AiError } from "../../extension/ai/errors.js";
import { createOpenAiCompatibleProvider } from "../../extension/ai/providers/openai-compatible.js";
import {
  chatCompletionResponse,
  createFakeFetch,
  jsonResponse,
} from "../helpers/fake-fetch.js";

function provider(fetchImpl, extraHeaders) {
  return createOpenAiCompatibleProvider({
    id: "demo",
    label: "Demo",
    defaultModel: "demo-model",
    baseUrl: "https://example.test/v1",
    extraHeaders,
    fetchImpl,
  });
}

describe("OpenAI-compatible provider (unit)", () => {
  it("posts chat completions with bearer auth and returns assistant text", async () => {
    const fetchImpl = createFakeFetch(() =>
      chatCompletionResponse("cleaned prompt")
    );
    const demo = provider(fetchImpl);

    const result = await demo.complete({
      apiKey: "sk-test",
      model: "demo-model",
      messages: [{ role: "user", content: "hello" }],
    });

    assert.equal(result.text, "cleaned prompt");
    assert.equal(fetchImpl.calls.length, 1);
    assert.equal(
      fetchImpl.calls[0].url,
      "https://example.test/v1/chat/completions"
    );
    assert.equal(fetchImpl.calls[0].init.method, "POST");
    assert.equal(
      fetchImpl.calls[0].init.headers.Authorization,
      "Bearer sk-test"
    );
    assert.equal(
      fetchImpl.calls[0].init.headers["Content-Type"],
      "application/json"
    );
    assert.deepEqual(JSON.parse(fetchImpl.calls[0].init.body), {
      model: "demo-model",
      messages: [{ role: "user", content: "hello" }],
    });
    assert.equal(JSON.parse(fetchImpl.calls[0].init.body).apiKey, undefined);
    assert.equal(typeof fetchImpl.calls[0].init.signal, "object");
  });

  it("includes extra headers when the provider supplies them", async () => {
    const fetchImpl = createFakeFetch(() => chatCompletionResponse("ok"));
    const demo = provider(fetchImpl, () => ({ "X-Title": "Prompt Enhancer" }));

    await demo.complete({
      apiKey: "sk-test",
      model: "demo-model",
      messages: [{ role: "user", content: "hello" }],
    });

    assert.equal(
      fetchImpl.calls[0].init.headers["X-Title"],
      "Prompt Enhancer"
    );
  });

  it("maps 401 and 403 to an invalid API key error", async () => {
    const fetchImpl = createFakeFetch(() =>
      jsonResponse({ error: { message: "Incorrect API key provided" } }, 401)
    );

    try {
      await provider(fetchImpl).complete({
        apiKey: "sk-bad",
        model: "demo-model",
        messages: [{ role: "user", content: "hello" }],
      });
      assert.fail("expected 401 to throw");
    } catch (error) {
      assert.ok(error instanceof AiError);
      assert.equal(error.code, AI_ERROR_CODES.INVALID_API_KEY);
      assert.equal(error.status, 401);
    }

    const forbidden = createFakeFetch(() => new Response("", { status: 403 }));

    try {
      await provider(forbidden).complete({
        apiKey: "sk-bad",
        model: "demo-model",
        messages: [{ role: "user", content: "hello" }],
      });
      assert.fail("expected 403 to throw");
    } catch (error) {
      assert.equal(error.code, AI_ERROR_CODES.INVALID_API_KEY);
      assert.equal(error.status, 403);
    }
  });

  it("maps 404 and model-parameter 400 responses to a model error", async () => {
    const notFound = createFakeFetch(() =>
      jsonResponse({ error: { message: "The model does not exist" } }, 404)
    );

    try {
      await provider(notFound).complete({
        apiKey: "sk-test",
        model: "missing",
        messages: [{ role: "user", content: "hello" }],
      });
      assert.fail("expected 404 to throw");
    } catch (error) {
      assert.equal(error.code, AI_ERROR_CODES.MODEL);
    }

    const badModel = createFakeFetch(() =>
      jsonResponse(
        { error: { message: "Invalid model", param: "model" } },
        400
      )
    );

    try {
      await provider(badModel).complete({
        apiKey: "sk-test",
        model: "nope",
        messages: [{ role: "user", content: "hello" }],
      });
      assert.fail("expected model 400 to throw");
    } catch (error) {
      assert.equal(error.code, AI_ERROR_CODES.MODEL);
    }
  });

  it("maps 429, other API failures, and network failures cleanly", async () => {
    const limited = createFakeFetch(() =>
      jsonResponse({ error: { message: "Rate limit exceeded" } }, 429)
    );

    try {
      await provider(limited).complete({
        apiKey: "sk-test",
        model: "demo-model",
        messages: [{ role: "user", content: "hello" }],
      });
      assert.fail("expected 429 to throw");
    } catch (error) {
      assert.equal(error.code, AI_ERROR_CODES.RATE_LIMITED);
    }

    const serverError = createFakeFetch(() =>
      jsonResponse({ error: { message: "upstream exploded" } }, 500)
    );

    try {
      await provider(serverError).complete({
        apiKey: "sk-test",
        model: "demo-model",
        messages: [{ role: "user", content: "hello" }],
      });
      assert.fail("expected 500 to throw");
    } catch (error) {
      assert.equal(error.code, AI_ERROR_CODES.API);
      assert.match(error.message, /provider|try again/i);
    }

    const offline = createFakeFetch(() => {
      throw new TypeError("fetch failed");
    });

    try {
      await provider(offline).complete({
        apiKey: "sk-test",
        model: "demo-model",
        messages: [{ role: "user", content: "hello" }],
      });
      assert.fail("expected network failure to throw");
    } catch (error) {
      assert.equal(error.code, AI_ERROR_CODES.NETWORK);
    }
  });

  it("maps an aborted request to a timeout error", async () => {
    const fetchImpl = createFakeFetch(() => {
      const error = new Error("The operation was aborted.");
      error.name = "AbortError";
      throw error;
    });

    try {
      await provider(fetchImpl).complete({
        apiKey: "sk-test",
        model: "demo-model",
        messages: [{ role: "user", content: "hello" }],
      });
      assert.fail("expected abort to throw");
    } catch (error) {
      assert.equal(error.code, AI_ERROR_CODES.NETWORK);
      assert.match(error.message, /timed out/i);
    }
  });

  it("rejects empty keys and empty model responses", async () => {
    try {
      await provider(createFakeFetch(() => chatCompletionResponse("x"))).complete({
        apiKey: "   ",
        model: "demo-model",
        messages: [{ role: "user", content: "hello" }],
      });
      assert.fail("expected missing key to throw");
    } catch (error) {
      assert.equal(error.code, AI_ERROR_CODES.MISSING_API_KEY);
    }

    const empty = createFakeFetch(() => jsonResponse({ choices: [] }));

    try {
      await provider(empty).complete({
        apiKey: "sk-test",
        model: "demo-model",
        messages: [{ role: "user", content: "hello" }],
      });
      assert.fail("expected empty choices to throw");
    } catch (error) {
      assert.equal(error.code, AI_ERROR_CODES.API);
    }
  });
});
