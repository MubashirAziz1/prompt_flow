import { createAiEngine } from "../ai/engine.js";
import { createProviderRegistry } from "../ai/providers/registry.js";
import {
  createChromeStorageAdapter,
  createSettingsStore,
} from "../ai/settings-store.js";
import { bindEnhanceFlow } from "./enhance-flow.js";

function initPromptPanel() {
  const promptInput = document.querySelector("#prompt-input");
  const actionButton = document.querySelector("#enhance-button");
  const outputElement = document.querySelector("#prompt-output");
  const statusElement = document.querySelector("#enhance-status");
  const openSettings = document.querySelector("#open-settings");

  if (!promptInput || !actionButton || !outputElement || !statusElement) {
    return;
  }

  const store = createSettingsStore({
    storage: createChromeStorageAdapter(chrome.storage),
  });
  const engine = createAiEngine({
    loadSettings: () => store.load(),
    registry: createProviderRegistry(),
  });

  bindEnhanceFlow({
    promptInput,
    actionButton,
    outputElement,
    statusElement,
    engine,
  });

  openSettings?.addEventListener("click", (event) => {
    event.preventDefault();
    Promise.resolve(chrome.runtime.openOptionsPage()).catch((error) => {
      console.error("Unable to open settings.", error);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPromptPanel);
} else {
  initPromptPanel();
}
