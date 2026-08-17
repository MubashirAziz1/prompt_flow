import { bindPromptForm } from "./prompt-form.js";

function initPromptPanel() {
  const promptInput = document.querySelector("#prompt-input");
  const actionButton = document.querySelector("#enhance-button");

  if (!promptInput || !actionButton) {
    return;
  }

  bindPromptForm({ promptInput, actionButton });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPromptPanel);
} else {
  initPromptPanel();
}
