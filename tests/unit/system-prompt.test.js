import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SYSTEM_PROMPT } from "../../extension/ai/system-prompt.js";

describe("system prompt (unit)", () => {
  it("exports a developer-owned default for all users", () => {
    assert.equal(typeof DEFAULT_SYSTEM_PROMPT, "string");
  });
});
