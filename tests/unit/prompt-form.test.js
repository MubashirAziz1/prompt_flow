import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bindPromptForm } from "../../extension/popup/prompt-form.js";

function fakeControl(value = "") {
  return {
    value,
    focused: false,
    listeners: {},
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    focus() {
      this.focused = true;
    },
  };
}

describe("bindPromptForm (unit)", () => {
  it("does not submit a blank prompt and focuses the textarea", () => {
    const promptInput = fakeControl("   ");
    const actionButton = fakeControl();
    const submitted = [];

    bindPromptForm({
      promptInput,
      actionButton,
      onSubmit(prompt) {
        submitted.push(prompt);
      },
    });

    actionButton.listeners.click();

    assert.deepEqual(submitted, []);
    assert.equal(promptInput.focused, true);
  });

  it("submits trimmed prompt text from the textarea", () => {
    const promptInput = fakeControl("  write a polite email  ");
    const actionButton = fakeControl();
    const submitted = [];

    bindPromptForm({
      promptInput,
      actionButton,
      onSubmit(prompt) {
        submitted.push(prompt);
      },
    });

    actionButton.listeners.click();

    assert.deepEqual(submitted, ["write a polite email"]);
  });
});
