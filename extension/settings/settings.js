import { createProviderRegistry } from "../ai/providers/registry.js";
import {
  createChromeStorageAdapter,
  createSettingsStore,
} from "../ai/settings-store.js";
import { bindSettingsForm } from "./settings-form.js";

async function initSettingsPage() {
  const apiKeyInput = document.querySelector("#api-key-input");
  const saveButton = document.querySelector("#save-settings");
  const statusElement = document.querySelector("#settings-status");
  const providerLabel = document.querySelector("#active-provider-label");

  if (!apiKeyInput || !saveButton || !statusElement) {
    return;
  }

  const store = createSettingsStore({
    storage: createChromeStorageAdapter(chrome.storage),
  });
  const registry = createProviderRegistry();

  await bindSettingsForm({
    apiKeyInput,
    saveButton,
    statusElement,
    providerLabel,
    store,
    getActiveProvider: () => registry.active(),
  });
}

function startSettingsPage() {
  initSettingsPage().catch((error) => {
    console.error("Unable to open settings.", error);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startSettingsPage);
} else {
  startSettingsPage();
}
