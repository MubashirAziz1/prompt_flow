import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bindFloatingChrome } from "../../extension/popup/floating-chrome.js";

function fakeNode(extra = {}) {
  return {
    listeners: {},
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    closest(selector) {
      return extra.closest?.(selector) ?? null;
    },
    ...extra,
  };
}

describe("floating chrome (unit)", () => {
  it("asks the parent frame to close and to start a header drag", () => {
    const posted = [];
    const header = fakeNode();
    const closeButton = fakeNode();

    bindFloatingChrome({
      header,
      closeButton,
      postMessage(data) {
        posted.push(data);
      },
    });

    closeButton.listeners.click();
    header.listeners.pointerdown({
      target: fakeNode(),
      clientX: 40,
      clientY: 12,
    });

    assert.deepEqual(posted, [
      { type: "prompt-enhancer:close" },
      { type: "prompt-enhancer:drag-start", clientX: 40, clientY: 12 },
    ]);
  });

  it("does not start a drag from Settings or Close", () => {
    const posted = [];
    const header = fakeNode();

    bindFloatingChrome({
      header,
      closeButton: fakeNode(),
      postMessage(data) {
        posted.push(data);
      },
    });

    header.listeners.pointerdown({
      target: fakeNode({
        closest(selector) {
          return selector.includes("button") || selector.includes("a")
            ? {}
            : null;
        },
      }),
      clientX: 1,
      clientY: 1,
    });

    assert.deepEqual(posted, []);
  });
});
