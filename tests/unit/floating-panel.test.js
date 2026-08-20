import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFloatingPanel } from "../../extension/content/floating-panel.js";

function createMemoryDocument() {
  const byId = new Map();

  function createElement(tag) {
    const attrs = {};
    const el = {
      tagName: String(tag).toUpperCase(),
      id: "",
      className: "",
      src: "",
      title: "",
      type: "",
      style: {},
      children: [],
      isConnected: false,
      shadowRoot: null,
      textContent: "",
      setAttribute(name, value) {
        attrs[name] = String(value);
      },
      getAttribute(name) {
        return attrs[name];
      },
      attachShadow() {
        const shadow = {
          children: [],
          appendChild(child) {
            this.children.push(child);
            return child;
          },
        };
        el.shadowRoot = shadow;
        return shadow;
      },
      appendChild(child) {
        this.children.push(child);
        child.parent = el;
        if (el.isConnected && child.id) {
          byId.set(child.id, child);
          child.isConnected = true;
        }
        return child;
      },
      remove() {
        el.isConnected = false;
        if (el.id) {
          byId.delete(el.id);
        }
      },
      addEventListener(type, listener) {
        el.listeners = el.listeners ?? {};
        el.listeners[type] = listener;
      },
    };
    return el;
  }

  const documentElement = {
    appendChild(el) {
      el.isConnected = true;
      if (el.id) {
        byId.set(el.id, el);
      }
      return el;
    },
  };

  return {
    createElement,
    getElementById(id) {
      return byId.get(id) ?? null;
    },
    documentElement,
  };
}

describe("floating panel host (unit)", () => {
  it("opens a fixed iframe host and toggles it closed without a page-click closer", () => {
    const doc = createMemoryDocument();
    const panel = createFloatingPanel({
      doc,
      getViewport: () => ({ width: 1280, height: 800 }),
      getPanelUrl: () => "chrome-extension://test/popup/popup.html",
    });

    assert.equal(panel.toggle(), true);
    const host = doc.getElementById("prompt-enhancer-floating-root");
    assert.ok(host);
    assert.equal(host.style.position, "fixed");
    assert.ok(host.shadowRoot);

    const iframe = host.shadowRoot.children.find((child) => child.tagName === "IFRAME");
    assert.equal(iframe?.src, "chrome-extension://test/popup/popup.html");
    assert.equal(iframe?.title, "Prompt Enhancer");

    assert.equal(panel.toggle(), false);
    assert.equal(doc.getElementById("prompt-enhancer-floating-root"), null);
    assert.equal(typeof panel.onDocumentClick, "undefined");
  });

  it("starts docked near the top-right of the viewport", () => {
    const doc = createMemoryDocument();
    const panel = createFloatingPanel({
      doc,
      getViewport: () => ({ width: 1280, height: 800 }),
      getPanelUrl: () => "popup.html",
    });

    panel.toggle();
    const host = doc.getElementById("prompt-enhancer-floating-root");
    assert.equal(host.style.top, "16px");
    assert.equal(host.style.left, "884px");
    assert.equal(host.style.width, "380px");
    assert.equal(host.style.height, "560px");
  });

  it("resizes from the corner handle and drags while staying on screen", () => {
    const doc = createMemoryDocument();
    const listeners = {};
    const win = {
      addEventListener(type, listener) {
        listeners[type] = listener;
      },
      removeEventListener(type) {
        delete listeners[type];
      },
    };
    const panel = createFloatingPanel({
      doc,
      win,
      getViewport: () => ({ width: 1280, height: 800 }),
      getPanelUrl: () => "popup.html",
    });

    panel.toggle();
    const host = doc.getElementById("prompt-enhancer-floating-root");
    const resize = host.shadowRoot.children.find((child) => child.className === "resize");
    resize.listeners.pointerdown({ clientX: 1264, clientY: 576 });
    listeners.pointermove({ clientX: 1280, clientY: 616 });
    listeners.pointerup();

    assert.equal(host.style.width, "396px");
    assert.equal(host.style.height, "600px");

    listeners.message({
      data: { type: "prompt-enhancer:drag-start", clientX: 900, clientY: 20 },
    });
    listeners.pointermove({ clientX: 800, clientY: 40 });
    assert.equal(host.style.left, "784px");
    assert.equal(host.style.top, "36px");
  });
});
