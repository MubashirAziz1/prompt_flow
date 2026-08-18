import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, it } from "node:test";
import { extensionFile, extensionRoot, fileExists, readManifest } from "../helpers.js";

function collectFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function referencedPaths(manifest) {
  const paths = [];

  if (manifest.background?.service_worker) {
    paths.push(manifest.background.service_worker);
  }

  if (manifest.action?.default_popup) {
    paths.push(manifest.action.default_popup);
  }

  if (manifest.side_panel?.default_path) {
    paths.push(manifest.side_panel.default_path);
  }

  if (manifest.options_ui?.page) {
    paths.push(manifest.options_ui.page);
  }

  for (const size of Object.keys(manifest.icons ?? {})) {
    paths.push(manifest.icons[size]);
  }

  for (const size of Object.keys(manifest.action?.default_icon ?? {})) {
    paths.push(manifest.action.default_icon[size]);
  }

  return paths;
}

describe("extension files (integration)", () => {
  it("keeps every manifest file reference on disk", () => {
    const manifest = readManifest();

    for (const relativePath of referencedPaths(manifest)) {
      assert.ok(
        fileExists(relativePath),
        `Missing file referenced by manifest: ${relativePath}`
      );
    }
  });

  it("does not reference icons unless the PNG files exist at the declared sizes", () => {
    const manifest = readManifest();
    const iconMaps = [manifest.icons, manifest.action?.default_icon].filter(Boolean);

    for (const iconMap of iconMaps) {
      for (const [size, relativePath] of Object.entries(iconMap)) {
        assert.ok(fileExists(relativePath), `Icon missing: ${relativePath}`);
        assert.ok(
          relativePath.endsWith(`-${size}.png`) || relativePath.endsWith(`/${size}.png`),
          `Icon path should encode its pixel size (${size}): ${relativePath}`
        );
      }
    }
  });

  it("uses external scripts only — no inline script or event handlers in HTML", () => {
    if (!existsSync(extensionRoot)) {
      assert.fail("extension/ directory is missing");
    }

    const htmlFiles = collectFiles(extensionRoot).filter(
      (filePath) => extname(filePath) === ".html"
    );

    for (const filePath of htmlFiles) {
      const html = readFileSync(filePath, "utf8");
      const relativePath = relative(extensionRoot, filePath);

      assert.doesNotMatch(
        html,
        /<script(?![^>]*\bsrc=)[^>]*>/i,
        `Inline script in ${relativePath}`
      );
      assert.doesNotMatch(
        html,
        /\son\w+\s*=/,
        `Inline event handler in ${relativePath}`
      );
    }
  });

  it("points the service worker at a real JavaScript module file", () => {
    const manifest = readManifest();
    const workerPath = extensionFile(manifest.background.service_worker);

    assert.ok(statSync(workerPath).isFile());
    assert.equal(extname(workerPath), ".js");

    const source = readFileSync(workerPath, "utf8");
    assert.ok(source.length > 0, "service worker file is empty");
    assert.match(source, /chrome\.runtime\.onInstalled/);
  });

  it("opens the side panel from the toolbar action click", () => {
    const manifest = readManifest();
    const source = readFileSync(
      extensionFile(manifest.background.service_worker),
      "utf8"
    );

    assert.match(source, /chrome\.sidePanel\.setPanelBehavior/);
    assert.match(source, /openPanelOnActionClick:\s*true/);
    assert.doesNotMatch(source, /openPanelOnActionIconClick/);
  });

  it("side panel UI has a prompt textarea, action button, and external script", () => {
    const manifest = readManifest();
    const htmlPath = extensionFile(manifest.side_panel.default_path);
    const html = readFileSync(htmlPath, "utf8");

    assert.match(html, /<textarea\b/i);
    assert.match(html, /<button\b/i);
    assert.match(html, /<script\b[^>]*\bsrc=/i);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);

    const scriptSrc = html.match(/<script\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
    assert.ok(scriptSrc, "side panel is missing an external script");
    const stylesheetHref = html.match(
      /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["']/i
    )?.[1];
    assert.ok(stylesheetHref, "side panel is missing an external stylesheet");

    const panelDir = join(htmlPath, "..");
    assert.ok(existsSync(join(panelDir, scriptSrc)), `Missing ${scriptSrc}`);
    assert.ok(
      existsSync(join(panelDir, stylesheetHref)),
      `Missing ${stylesheetHref}`
    );
  });

  it("does not ship an OpenAI provider module", () => {
    assert.equal(existsSync(extensionFile("ai/providers/openai.js")), false);
    assert.equal(existsSync(extensionFile("ai/providers/openrouter.js")), true);

    const registry = readFileSync(
      extensionFile("ai/providers/registry.js"),
      "utf8"
    );
    assert.doesNotMatch(registry, /openai\.js/);
    assert.match(registry, /openrouter\.js/);

    const config = readFileSync(extensionFile("ai/provider-config.js"), "utf8");
    assert.match(config, /openrouter/);
    assert.doesNotMatch(config, /["']openai["']/);
  });

  it("keeps provider HTTP logic out of the side panel UI", () => {
    const panelJs = readFileSync(extensionFile("sidepanel/sidepanel.js"), "utf8");
    const formJs = readFileSync(extensionFile("sidepanel/prompt-form.js"), "utf8");
    const flowJs = readFileSync(
      extensionFile("sidepanel/enhance-flow.js"),
      "utf8"
    );

    for (const source of [panelJs, formJs, flowJs]) {
      assert.doesNotMatch(source, /openai\.js/);
      assert.doesNotMatch(source, /openrouter\.js/);
      assert.doesNotMatch(source, /api\.openai\.com/);
      assert.doesNotMatch(source, /openrouter\.ai/);
    }
  });

  it("settings page asks only for an API key", () => {
    const html = readFileSync(extensionFile("settings/settings.html"), "utf8");

    assert.match(html, /<input\b[^>]*\bid=["']api-key-input["']/i);
    assert.match(html, /<button\b[^>]*\bid=["']save-settings["']/i);
    assert.match(html, /type=["']password["']/i);
    assert.match(html, /<script\b[^>]*\bsrc=/i);
    assert.doesNotMatch(html, /id=["']provider-select["']/i);
    assert.doesNotMatch(html, /id=["']model-input["']/i);
    assert.doesNotMatch(html, /id=["']system-prompt-input["']/i);
  });
});
