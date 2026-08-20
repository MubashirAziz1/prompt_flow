import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { extensionFile } from "../helpers.js";

function readExtension(relativePath) {
  return readFileSync(extensionFile(relativePath), "utf8");
}

function firstStylesheetHref(html) {
  return html.match(
    /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["']/i
  )?.[1];
}

function resolveFromHtml(htmlRelativePath, href) {
  return join(dirname(extensionFile(htmlRelativePath)), href);
}

describe("UI polish (unit)", () => {
  it("keeps every popup control, label, and script the JS already binds", () => {
    const html = readExtension("popup/popup.html");

    assert.match(html, /id=["']prompt-input["']/);
    assert.match(html, /id=["']prompt-output["']/);
    assert.match(html, /id=["']enhance-button["']/);
    assert.match(html, /id=["']enhance-status["']/);
    assert.match(html, /id=["']open-settings["']/);
    assert.match(html, /id=["']close-panel["']/);
    assert.match(html, /id=["']copy-button["']/);
    assert.match(html, /id=["']edit-button["']/);
    assert.match(html, /<label\b[^>]*for=["']prompt-input["'][^>]*>\s*Your draft\s*<\/label>/i);
    assert.match(
      html,
      /<label\b[^>]*for=["']prompt-output["'][^>]*>\s*Refined\s*<\/label>/i
    );
    assert.match(html, /<button\b[^>]*id=["']enhance-button["'][^>]*>[\s\S]*Clarify[\s\S]*<\/button>/);
    assert.match(html, /<button\b[^>]*id=["']copy-button["'][^>]*>[\s\S]*Copy[\s\S]*<\/button>/);
    assert.match(html, /<button\b[^>]*id=["']edit-button["'][^>]*>[\s\S]*Edit[\s\S]*<\/button>/);
    assert.match(html, /<textarea\b[^>]*id=["']prompt-output["'][^>]*\breadonly\b/);
    assert.match(html, /role=["']status["']/);
    assert.match(html, /aria-live=["']polite["']/);
    assert.match(html, /<script\b[^>]*\bsrc=["']popup\.js["']/);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
    assert.doesNotMatch(html, /\son\w+\s*=/);
  });

  it("keeps every settings control the JS already binds", () => {
    const html = readExtension("settings/settings.html");

    assert.match(html, /id=["']api-key-input["']/);
    assert.match(html, /id=["']save-settings["']/);
    assert.match(html, /id=["']settings-status["']/);
    assert.match(html, /id=["']active-provider-label["']/);
    assert.match(html, /<label\b[^>]*for=["']api-key-input["'][^>]*>\s*API key\s*<\/label>/);
    assert.match(html, /<button\b[^>]*id=["']save-settings["'][^>]*>\s*Save\s*<\/button>/);
    assert.match(html, /type=["']password["']/);
    assert.match(html, /<script\b[^>]*\bsrc=["']settings\.js["']/);
    assert.doesNotMatch(html, /id=["']provider-select["']/);
    assert.doesNotMatch(html, /id=["']model-input["']/);
    assert.doesNotMatch(html, /id=["']system-prompt-input["']/);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
    assert.doesNotMatch(html, /\son\w+\s*=/);
  });

  it("gives the popup a sticky header with a status dot and keeps the draft visible with the result", () => {
    const popup = readExtension("popup/popup.html");
    const settings = readExtension("settings/settings.html");

    assert.match(popup, /class=["'][^"']*\bpopup-header\b[^"']*["']/);
    assert.match(popup, /class=["'][^"']*\bstatus-dot\b[^"']*["']/);
    assert.match(popup, /aria-hidden=["']true["']/);
    assert.match(popup, /id=["']prompt-input["']/);
    assert.match(popup, /id=["']prompt-output["']/);
    assert.match(
      popup,
      /id=["']prompt-input["'][\s\S]*id=["']enhance-button["'][\s\S]*id=["']prompt-output["']/
    );
    assert.match(
      settings,
      /<section\b[^>]*class=["'][^"']*\bfield\b[^"']*["'][^>]*>[\s\S]*id=["']api-key-input["']/
    );
    assert.match(settings, /class=["'][^"']*\bsettings-body\b[^"']*["']/);
  });

  it("styles the popup with Prompt Clarity tokens, local fonts, and a constrained panel", () => {
    const popupHtml = readExtension("popup/popup.html");
    const href = firstStylesheetHref(popupHtml);
    assert.ok(href, "popup is missing a stylesheet");
    assert.match(href, /popup\.css$/);

    const cssPath = resolveFromHtml("popup/popup.html", href);
    assert.equal(existsSync(cssPath), true, `Missing ${href}`);

    const css = readFileSync(cssPath, "utf8");
    for (const token of [
      "#1F7A72",
      "#0F6E56",
      "#1E2321",
      "#5B655F",
      "#EDEBE4",
      "#F6F5F1",
      "#EFEDE6",
      "#E7E3DA",
      "#C98A2E",
    ]) {
      assert.match(css, new RegExp(token.replace("#", "#")));
    }

    assert.match(css, /Public Sans/);
    assert.match(css, /IBM Plex Mono/);
    assert.match(css, /@font-face/);
    assert.doesNotMatch(css, /fonts\.googleapis\.com/);
    assert.match(css, /width:\s*100%/);
    assert.match(css, /height:\s*100%/);
    assert.match(css, /position:\s*sticky/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(css, /overflow-y:\s*auto/);
  });

  it("ships popup fonts as local files referenced by @font-face", () => {
    const css = readExtension("popup/popup.css");
    const urls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(
      (match) => match[1]
    );

    assert.ok(urls.length > 0, "popup.css has no local font urls");
    for (const href of urls) {
      assert.doesNotMatch(href, /^https?:\/\//);
      const fontPath = resolveFromHtml("popup/popup.css", href);
      assert.equal(existsSync(fontPath), true, `Missing font file: ${href}`);
    }
  });

  it("keeps settings on the shared theme stylesheet", () => {
    const settingsHtml = readExtension("settings/settings.html");
    const settingsHref = firstStylesheetHref(settingsHtml);

    assert.ok(settingsHref, "settings page is missing a stylesheet");
    assert.match(settingsHref, /theme\.css$/);

    const themePath = resolveFromHtml("settings/settings.html", settingsHref);
    assert.equal(existsSync(themePath), true, `Missing ${settingsHref}`);

    const css = readFileSync(themePath, "utf8");
    for (const token of [
      "--bg",
      "--surface",
      "--text",
      "--muted",
      "--border",
      "--accent",
      "--accent-hover",
      "--accent-text",
      "--focus",
      "--radius",
      "--shadow",
    ]) {
      assert.match(css, new RegExp(token.replace("--", "\\-\\-")));
    }

    assert.match(css, /prefers-color-scheme:\s*dark/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(css, /forced-colors:\s*active/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /button:hover/);
    assert.match(css, /button:active/);
    assert.match(css, /button:disabled/);
    assert.match(css, /a:focus-visible/);
  });

  it("keeps page-specific stylesheets alongside the shared theme", () => {
    const popup = readExtension("popup/popup.html");
    const settings = readExtension("settings/settings.html");

    assert.match(popup, /href=["']popup\.css["']/);
    assert.match(settings, /href=["']settings\.css["']/);
    assert.equal(existsSync(extensionFile("popup/popup.css")), true);
    assert.equal(existsSync(extensionFile("settings/settings.css")), true);
    assert.equal(existsSync(extensionFile("sidepanel/sidepanel.html")), false);
  });

  it("cards the settings page instead of stretching the popup layout", () => {
    const css = readExtension("settings/settings.css");

    assert.match(css, /\.settings-panel/);
    assert.match(css, /max-width/);
    assert.match(css, /box-shadow|var\(--shadow/);
    assert.match(css, /border-radius|var\(--radius/);
    assert.doesNotMatch(css, /height:\s*100%/);
  });
});
