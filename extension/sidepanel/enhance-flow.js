import { toUserMessage } from "../ai/errors.js";
import { bindPromptForm } from "./prompt-form.js";

export function bindEnhanceFlow({
  promptInput,
  actionButton,
  outputElement,
  statusElement,
  engine,
  fetchImpl,
}) {
  bindPromptForm({
    promptInput,
    actionButton,
    async onSubmit(prompt) {
      actionButton.disabled = true;
      statusElement.textContent = "Working…";
      outputElement.value = "";

      try {
        const result = await engine.complete({ userPrompt: prompt, fetchImpl });
        outputElement.value = result.text;
        statusElement.textContent = "";
      } catch (error) {
        outputElement.value = "";
        statusElement.textContent = toUserMessage(error);
      } finally {
        actionButton.disabled = false;
      }
    },
  });
}
