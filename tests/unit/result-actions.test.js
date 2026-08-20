import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bindResultActions } from "../../extension/popup/result-actions.js";
import { fakeControl } from "../helpers/fake-controls.js";

describe("result actions (unit)", () => {
  it("copies refined text and reports success in the status area", async () => {
    const written = [];
    const promptInput = fakeControl("draft");
    const outputElement = fakeControl("refined prompt");
    const copyButton = fakeControl();
    const editButton = fakeControl();
    const statusElement = fakeControl();

    bindResultActions({
      promptInput,
      outputElement,
      copyButton,
      editButton,
      statusElement,
      clipboard: {
        async writeText(text) {
          written.push(text);
        },
      },
    });

    await copyButton.listeners.click();

    assert.deepEqual(written, ["refined prompt"]);
    assert.match(statusElement.textContent, /copied/i);
    assert.equal(promptInput.value, "draft");
  });

  it("does not copy when the refined result is empty", async () => {
    const written = [];
    const copyButton = fakeControl();
    const statusElement = fakeControl();

    bindResultActions({
      promptInput: fakeControl(),
      outputElement: fakeControl("   "),
      copyButton,
      editButton: fakeControl(),
      statusElement,
      clipboard: {
        async writeText(text) {
          written.push(text);
        },
      },
    });

    await copyButton.listeners.click();

    assert.deepEqual(written, []);
    assert.equal(statusElement.textContent, "");
  });

  it("moves the refined text into the draft for further editing", () => {
    const promptInput = fakeControl("original draft");
    const outputElement = fakeControl("refined prompt");
    const editButton = fakeControl();

    bindResultActions({
      promptInput,
      outputElement,
      copyButton: fakeControl(),
      editButton,
      statusElement: fakeControl(),
      clipboard: { async writeText() {} },
    });

    editButton.listeners.click();

    assert.equal(promptInput.value, "refined prompt");
    assert.equal(promptInput.focused, true);
  });

  it("does not overwrite the draft when the refined result is empty", () => {
    const promptInput = fakeControl("keep this");
    const editButton = fakeControl();

    bindResultActions({
      promptInput,
      outputElement: fakeControl("   "),
      copyButton: fakeControl(),
      editButton,
      statusElement: fakeControl(),
      clipboard: { async writeText() {} },
    });

    editButton.listeners.click();

    assert.equal(promptInput.value, "keep this");
    assert.equal(promptInput.focused, false);
  });

  it("reports when the clipboard write fails", async () => {
    const statusElement = fakeControl();
    const copyButton = fakeControl();
    const logged = console.error;
    console.error = () => {};

    try {
      bindResultActions({
        promptInput: fakeControl(),
        outputElement: fakeControl("refined prompt"),
        copyButton,
        editButton: fakeControl(),
        statusElement,
        clipboard: {
          async writeText() {
            throw new Error("denied");
          },
        },
      });

      await copyButton.listeners.click();

      assert.match(statusElement.textContent, /unable to copy/i);
    } finally {
      console.error = logged;
    }
  });
});
