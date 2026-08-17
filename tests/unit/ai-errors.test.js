import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AI_ERROR_CODES,
  AiError,
  toUserMessage,
} from "../../extension/ai/errors.js";

describe("AiError (unit)", () => {
  it("exposes a stable code and user-facing message", () => {
    const error = new AiError(
      AI_ERROR_CODES.INVALID_API_KEY,
      "The API key was rejected. Check it in Settings."
    );

    assert.equal(error.name, "AiError");
    assert.equal(error.code, "invalid_api_key");
    assert.equal(
      error.message,
      "The API key was rejected. Check it in Settings."
    );
    assert.equal(error.status, null);
  });

  it("maps known errors to their message and unknown errors to a generic fallback", () => {
    const known = new AiError(
      AI_ERROR_CODES.MISSING_API_KEY,
      "Add an API key in Settings before enhancing a prompt."
    );

    assert.equal(toUserMessage(known), known.message);
    assert.equal(toUserMessage(new Error("ECONNRESET")), "Something went wrong. Try again.");
    assert.equal(toUserMessage("boom"), "Something went wrong. Try again.");
  });
});
