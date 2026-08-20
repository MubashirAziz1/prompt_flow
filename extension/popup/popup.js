import { createAiEngine } from "../ai/engine.js";
import { createProviderRegistry } from "../ai/providers/registry.js";
import {
  createChromeStorageAdapter,
  createSettingsStore,
} from "../ai/settings-store.js";
import { bindEnhanceFlow } from "./enhance-flow.js";
import { bindFloatingChrome } from "./floating-chrome.js";
import { createPopupState } from "./popup-state.js";
import { bindResultActions } from "./result-actions.js";

async function initPromptPanel() {
  const promptInput = document.querySelector("#prompt-input");
  const actionButton = document.querySelector("#enhance-button");
  const actionLabel = document.querySelector("#enhance-button-label");
  const outputElement = document.querySelector("#prompt-output");
  const statusElement = document.querySelector("#enhance-status");
  const openSettings = document.querySelector("#open-settings");
  const copyButton = document.querySelector("#copy-button");
  const editButton = document.querySelector("#edit-button");

  if (!promptInput || !actionButton || !outputElement || !statusElement) {
    return;
  }

  const storage = createChromeStorageAdapter(chrome.storage);
  const popupState = createPopupState({ storage });
  const store = createSettingsStore({ storage });
  const engine = createAiEngine({
    loadSettings: () => store.load(),
    registry: createProviderRegistry(),
  });

  try {
    const saved = await popupState.load();
    promptInput.value = saved.draft;
    outputElement.value = saved.result;
  } catch (error) {
    console.error("Unable to restore popup state.", error);
  }

  promptInput.addEventListener("input", async () => {
    try {
      await popupState.save({ draft: promptInput.value });
    } catch (error) {
      console.error("Unable to save draft.", error);
    }
  });

  bindEnhanceFlow({
    promptInput,
    actionButton,
    actionLabel,
    outputElement,
    statusElement,
    engine,
    async onSuccess(text) {
      await popupState.save({ result: text });
    },
  });

  if (copyButton && editButton) {
    bindResultActions({
      promptInput,
      outputElement,
      copyButton,
      editButton,
      statusElement,
      onDraftChange(draft) {
        void persistDraft(popupState, draft);
      },
    });
  }

  openSettings?.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      await chrome.runtime.openOptionsPage();
    } catch (error) {
      console.error("Unable to open settings.", error);
    }
  });

  bindFloatingChrome({
    header: document.querySelector(".popup-header"),
    closeButton: document.querySelector("#close-panel"),
  });
}

async function persistDraft(popupState, draft) {
  try {
    await popupState.save({ draft });
  } catch (error) {
    console.error("Unable to save draft.", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initPromptPanel().catch((error) => {
      console.error("Unable to start the popup.", error);
    });
  });
} else {
  initPromptPanel().catch((error) => {
    console.error("Unable to start the popup.", error);
  });
}
