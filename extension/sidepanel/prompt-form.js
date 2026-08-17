export function bindPromptForm({ promptInput, actionButton, onSubmit }) {
  actionButton.addEventListener("click", () => {
    const prompt = String(promptInput.value ?? "").trim();

    if (!prompt) {
      promptInput.focus();
      return;
    }

    onSubmit?.(prompt);
  });
}
