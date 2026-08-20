function defaultWriteText() {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return undefined;
  }

  return navigator.clipboard.writeText.bind(navigator.clipboard);
}

export function bindResultActions({
  promptInput,
  outputElement,
  copyButton,
  editButton,
  statusElement,
  clipboard,
  onDraftChange,
}) {
  const writeText = clipboard?.writeText?.bind(clipboard) ?? defaultWriteText();

  copyButton.addEventListener("click", async () => {
    const text = String(outputElement.value ?? "").trim();
    if (!text || !writeText) {
      return;
    }

    try {
      await writeText(text);
      statusElement.textContent = "Copied";
    } catch (error) {
      console.error("Unable to copy.", error);
      statusElement.textContent = "Unable to copy";
    }
  });

  editButton.addEventListener("click", () => {
    const text = String(outputElement.value ?? "").trim();
    if (!text) {
      return;
    }

    promptInput.value = text;
    promptInput.focus();
    onDraftChange?.(text);
  });
}
