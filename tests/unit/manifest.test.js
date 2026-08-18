import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readManifest } from "../helpers.js";

describe("manifest.json (unit)", () => {
  it("is valid Manifest V3 JSON with required identity fields", () => {
    const manifest = readManifest();

    assert.equal(manifest.manifest_version, 3);
    assert.equal(typeof manifest.name, "string");
    assert.ok(manifest.name.length > 0);
    assert.match(manifest.version, /^\d+(\.\d+){0,3}$/);
    assert.equal(typeof manifest.description, "string");
    assert.ok(manifest.description.length > 0);
  });

  it("declares an ES module service worker and an action entry", () => {
    const manifest = readManifest();

    assert.equal(typeof manifest.background?.service_worker, "string");
    assert.ok(manifest.background.service_worker.length > 0);
    assert.equal(manifest.background.type, "module");
    assert.equal(typeof manifest.action, "object");
    assert.ok(manifest.action !== null);
  });

  it("does not use Manifest V2 background or browserAction keys", () => {
    const manifest = readManifest();

    assert.equal(manifest.background?.scripts, undefined);
    assert.equal(manifest.background?.page, undefined);
    assert.equal(manifest.background?.persistent, undefined);
    assert.equal(manifest.browser_action, undefined);
    assert.equal(manifest.page_action, undefined);
  });

  it("declares a side panel and the sidePanel permission", () => {
    const manifest = readManifest();

    assert.ok(Array.isArray(manifest.permissions));
    assert.ok(manifest.permissions.includes("sidePanel"));
    assert.equal(typeof manifest.side_panel?.default_path, "string");
    assert.ok(manifest.side_panel.default_path.endsWith(".html"));
    assert.equal(manifest.action?.default_popup, undefined);
  });

  it("stores settings locally and allows the OpenRouter host only", () => {
    const manifest = readManifest();

    assert.ok(manifest.permissions.includes("storage"));
    assert.equal(typeof manifest.options_ui?.page, "string");
    assert.ok(manifest.options_ui.page.endsWith(".html"));
    assert.ok(Array.isArray(manifest.host_permissions));
    assert.deepEqual(manifest.host_permissions, [
      "https://openrouter.ai/api/v1/*",
    ]);
    assert.ok(
      !manifest.host_permissions.includes("https://api.openai.com/v1/*")
    );
    assert.ok(!manifest.host_permissions.includes("<all_urls>"));
  });
});
