import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAiEngine } from "../../extension/ai/engine.js";
import { createProviderRegistry } from "../../extension/ai/providers/registry.js";
import { createSettingsStore } from "../../extension/ai/settings-store.js";
import { bindEnhanceFlow } from "../../extension/popup/enhance-flow.js";
import { chatCompletionResponse, createFakeFetch } from "../helpers/fake-fetch.js";
import { fakeControl } from "../helpers/fake-controls.js";
import { createMemoryStorage } from "../helpers/memory-storage.js";

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

function fakeAction(label = "Clarify") {
  const actionLabel = fakeControl();
  actionLabel.textContent = label;
  const actionButton = {
    ...fakeControl(),
    dataset: { state: "clarify" },
    disabled: false,
  };
  return { actionButton, actionLabel };
}

describe("enhance flow (unit)", () => {
  it("writes the model response to the output area", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });
    await store.save({
      apiKeys: { openrouter: "sk-or-test" },
    });
    const fetchImpl = createFakeFetch(() =>
      chatCompletionResponse("polished prompt")
    );
    const engine = createAiEngine({
      loadSettings: () => store.load(),
      registry: createProviderRegistry(),
    });
    const promptInput = fakeControl("  draft this  ");
    const { actionButton, actionLabel } = fakeAction();
    const outputElement = fakeControl();
    const statusElement = fakeControl();
    const scheduled = [];

    bindEnhanceFlow({
      promptInput,
      actionButton,
      actionLabel,
      outputElement,
      statusElement,
      engine,
      fetchImpl,
      idleDelayMs: 10,
      setTimeoutFn: (fn) => {
        scheduled.push(fn);
        return 1;
      },
    });

    const pending = actionButton.listeners.click();
    assert.equal(actionButton.disabled, true);
    assert.equal(actionButton.dataset.state, "clarifying");
    assert.match(actionLabel.textContent, /clarifying/i);
    await pending;
    await flush();

    assert.equal(outputElement.value, "polished prompt");
    assert.equal(statusElement.textContent, "");
    assert.equal(actionButton.disabled, false);
    assert.equal(actionButton.dataset.state, "clarified");
    assert.match(actionLabel.textContent, /clarified/i);

    scheduled.forEach((fn) => fn());
    assert.equal(actionButton.dataset.state, "clarify");
    assert.match(actionLabel.textContent, /^clarify$/i);
  });

  it("does not let a prior success timer reset a new clarifying run", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });
    await store.save({
      apiKeys: { openrouter: "sk-or-test" },
    });
    let resolveSecond;
    const secondResponse = new Promise((resolve) => {
      resolveSecond = resolve;
    });
    const fetchImpl = createFakeFetch(({ calls }) => {
      if (calls.length === 1) {
        return chatCompletionResponse("first");
      }
      return secondResponse.then((text) => chatCompletionResponse(text));
    });
    const engine = createAiEngine({
      loadSettings: () => store.load(),
      registry: createProviderRegistry(),
    });
    const promptInput = fakeControl("first draft");
    const { actionButton, actionLabel } = fakeAction();
    const outputElement = fakeControl();
    const statusElement = fakeControl();
    const timers = new Map();
    let nextTimerId = 1;

    bindEnhanceFlow({
      promptInput,
      actionButton,
      actionLabel,
      outputElement,
      statusElement,
      engine,
      fetchImpl,
      idleDelayMs: 10,
      setTimeoutFn: (fn) => {
        const id = nextTimerId;
        nextTimerId += 1;
        timers.set(id, fn);
        return id;
      },
      clearTimeoutFn: (id) => {
        timers.delete(id);
      },
    });

    await actionButton.listeners.click();
    await flush();
    assert.equal(actionButton.dataset.state, "clarified");

    promptInput.value = "second draft";
    const pendingSecond = actionButton.listeners.click();
    await flush();
    assert.equal(actionButton.dataset.state, "clarifying");
    assert.equal(actionButton.disabled, true);

    for (const fn of [...timers.values()]) {
      fn();
    }
    const stateAfterStaleTimer = actionButton.dataset.state;
    const disabledAfterStaleTimer = actionButton.disabled;
    const labelAfterStaleTimer = actionLabel.textContent;

    resolveSecond("second");
    await pendingSecond;
    await flush();

    assert.equal(stateAfterStaleTimer, "clarifying");
    assert.equal(disabledAfterStaleTimer, true);
    assert.match(labelAfterStaleTimer, /clarifying/i);
    assert.equal(outputElement.value, "second");
  });

  it("shows a missing-key error in the status area and leaves output empty", async () => {
    const store = createSettingsStore({ storage: createMemoryStorage() });
    const engine = createAiEngine({
      loadSettings: () => store.load(),
      registry: createProviderRegistry(),
    });
    const promptInput = fakeControl("hello");
    const { actionButton, actionLabel } = fakeAction();
    const outputElement = fakeControl("old");
    const statusElement = fakeControl();

    bindEnhanceFlow({
      promptInput,
      actionButton,
      actionLabel,
      outputElement,
      statusElement,
      engine,
      fetchImpl: createFakeFetch(() => chatCompletionResponse("nope")),
    });

    await actionButton.listeners.click();
    await flush();

    assert.equal(outputElement.value, "");
    assert.match(statusElement.textContent, /api key/i);
    assert.equal(actionButton.disabled, false);
    assert.equal(actionButton.dataset.state, "clarify");
    assert.match(actionLabel.textContent, /^clarify$/i);
  });
});
