import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canInjectIntoUrl } from "../../extension/background/injectable-tab.js";
import { openFloatingPanel } from "../../extension/background/open-floating-panel.js";

describe("injectable tab (unit)", () => {
  it("allows ordinary web pages", () => {
    assert.equal(canInjectIntoUrl("https://example.com/app"), true);
    assert.equal(canInjectIntoUrl("http://localhost:3000/"), true);
  });

  it("rejects chrome:// and other browser pages that cannot host the panel", () => {
    assert.equal(canInjectIntoUrl("chrome://extensions/"), false);
    assert.equal(canInjectIntoUrl("chrome://settings/"), false);
    assert.equal(canInjectIntoUrl("edge://extensions/"), false);
    assert.equal(canInjectIntoUrl("about:blank"), false);
    assert.equal(canInjectIntoUrl("chrome-extension://abcdef/popup/popup.html"), false);
  });
});

describe("open floating panel (unit)", () => {
  it("does not inject or log an error on chrome://extensions", async () => {
    const calls = [];
    const errors = [];

    await openFloatingPanel({
      tab: { id: 12, url: "chrome://extensions/" },
      executeScript: async (details) => {
        calls.push(details);
      },
      logError: (message, error) => {
        errors.push({ message, error });
      },
    });

    assert.deepEqual(calls, []);
    assert.deepEqual(errors, []);
  });

  it("injects the floating panel loader on an https tab", async () => {
    const calls = [];

    await openFloatingPanel({
      tab: { id: 8, url: "https://example.com" },
      executeScript: async (details) => {
        calls.push(details);
      },
      logError: () => {
        throw new Error("should not log");
      },
    });

    assert.deepEqual(calls, [
      { target: { tabId: 8 }, files: ["content/loader.js"] },
    ]);
  });
});
