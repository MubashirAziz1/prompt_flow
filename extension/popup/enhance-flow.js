import { toUserMessage } from "../ai/errors.js";
import { bindPromptForm } from "./prompt-form.js";

const ACTION_LABELS = {
  clarify: "Clarify",
  clarifying: "Clarifying",
  clarified: "Clarified",
};

function setActionState(actionButton, actionLabel, state) {
  actionButton.dataset.state = state;
  actionButton.disabled = state === "clarifying";
  actionButton.setAttribute?.("aria-busy", state === "clarifying" ? "true" : "false");

  if (actionLabel) {
    actionLabel.textContent = ACTION_LABELS[state];
    return;
  }

  actionButton.textContent = ACTION_LABELS[state];
}

export function bindEnhanceFlow({
  promptInput,
  actionButton,
  actionLabel,
  outputElement,
  statusElement,
  engine,
  fetchImpl,
  onSuccess,
  idleDelayMs = 1400,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) {
  let resetTimerId = 0;

  bindPromptForm({
    promptInput,
    actionButton,
    async onSubmit(prompt) {
      if (resetTimerId) {
        clearTimeoutFn(resetTimerId);
        resetTimerId = 0;
      }

      setActionState(actionButton, actionLabel, "clarifying");
      statusElement.textContent = "";
      outputElement.value = "";

      try {
        const result = await engine.complete({ userPrompt: prompt, fetchImpl });
        outputElement.value = result.text;
        statusElement.textContent = "";
        setActionState(actionButton, actionLabel, "clarified");
        await onSuccess?.(result.text);
        resetTimerId = setTimeoutFn(() => {
          resetTimerId = 0;
          setActionState(actionButton, actionLabel, "clarify");
        }, idleDelayMs);
      } catch (error) {
        outputElement.value = "";
        statusElement.textContent = toUserMessage(error);
        setActionState(actionButton, actionLabel, "clarify");
      }
    },
  });
}
