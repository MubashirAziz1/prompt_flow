import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { waitForTarget, withLoadedExtension } from "../helpers/chrome-session.js";

describe("unpacked extension load (e2e)", () => {
  it("loads in Chrome without manifest or service worker errors", async () => {
    await withLoadedExtension(async ({ cdp, extensionId }) => {
      assert.match(extensionId, /^[a-p]{32}$/);

      const { extensions } = await cdp.send("Extensions.getExtensions");
      const loaded = extensions.find((extension) => extension.id === extensionId);

      assert.ok(
        loaded,
        `Extension ${extensionId} was not listed after loadUnpacked`
      );
      assert.equal(loaded.name, "Prompt Enhancer");
      assert.equal(loaded.enabled, true);
      assert.equal(loaded.version, "0.1.0");

      const workerUrl = `chrome-extension://${extensionId}/background/service-worker.js`;
      const worker = await waitForTarget(
        cdp,
        (target) => String(target?.url ?? "").startsWith(workerUrl)
      );
      assert.ok(worker);
    });
  });

  it("loads the side panel prompt UI with a textarea and action button", async () => {
    await withLoadedExtension(async ({ cdp, extensionId }) => {
      const panelUrl = `chrome-extension://${extensionId}/sidepanel/sidepanel.html`;
      const created = await cdp.send("Target.createTarget", { url: panelUrl });
      const panel = await waitForTarget(
        cdp,
        (target) =>
          target?.targetId === created.targetId ||
          String(target?.url ?? "").startsWith(panelUrl)
      );

      const { sessionId } = await cdp.send("Target.attachToTarget", {
        targetId: panel.targetId,
        flatten: true,
      });

      await cdp.send("Runtime.enable", {}, sessionId);

      let ui;
      for (let i = 0; i < 15; i += 1) {
        const { result } = await cdp.send(
          "Runtime.evaluate",
          {
            expression: `({
              textarea: Boolean(document.querySelector('#prompt-input')),
              output: Boolean(document.querySelector('#prompt-output')),
              button: Boolean(document.querySelector('#enhance-button')),
              buttonLabel: document.querySelector('#enhance-button')?.textContent?.trim() ?? '',
              settingsLink: Boolean(document.querySelector('#open-settings'))
            })`,
            returnByValue: true,
          },
          sessionId
        );
        ui = result.value;
        if (ui.textarea && ui.button && ui.buttonLabel) {
          break;
        }
        await delay(200);
      }

      assert.equal(ui.textarea, true);
      assert.equal(ui.output, true);
      assert.equal(ui.button, true);
      assert.ok(ui.buttonLabel.length > 0, "Action button is missing a label");
      assert.equal(ui.settingsLink, true);
    });
  });

  it("loads the settings page with an API key field only", async () => {
    await withLoadedExtension(async ({ cdp, extensionId }) => {
      const settingsUrl = `chrome-extension://${extensionId}/settings/settings.html`;
      const created = await cdp.send("Target.createTarget", { url: settingsUrl });
      const page = await waitForTarget(
        cdp,
        (target) =>
          target?.targetId === created.targetId ||
          String(target?.url ?? "").startsWith(settingsUrl)
      );

      const { sessionId } = await cdp.send("Target.attachToTarget", {
        targetId: page.targetId,
        flatten: true,
      });

      await cdp.send("Runtime.enable", {}, sessionId);

      let ui;
      for (let i = 0; i < 15; i += 1) {
        const { result } = await cdp.send(
          "Runtime.evaluate",
          {
            expression: `({
              providerSelect: Boolean(document.querySelector('#provider-select')),
              apiKey: document.querySelector('#api-key-input')?.type ?? '',
              model: Boolean(document.querySelector('#model-input')),
              systemPrompt: Boolean(document.querySelector('#system-prompt-input')),
              save: Boolean(document.querySelector('#save-settings'))
            })`,
            returnByValue: true,
          },
          sessionId
        );
        ui = result.value;
        if (ui.apiKey && ui.save) {
          break;
        }
        await delay(200);
      }

      assert.equal(ui.apiKey, "password");
      assert.equal(ui.save, true);
      assert.equal(ui.providerSelect, false);
      assert.equal(ui.model, false);
      assert.equal(ui.systemPrompt, false);
    });
  });
});
