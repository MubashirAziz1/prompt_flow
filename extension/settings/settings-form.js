export async function bindSettingsForm({
  apiKeyInput,
  saveButton,
  statusElement,
  providerLabel,
  store,
  getActiveProvider,
}) {
  const provider = getActiveProvider();
  const settings = await store.load();

  if (providerLabel) {
    providerLabel.textContent = provider.label;
  }

  apiKeyInput.value = settings.apiKeys[provider.id] ?? "";

  saveButton.addEventListener("click", async () => {
    try {
      await store.save({
        apiKeys: { [provider.id]: apiKeyInput.value },
      });
      statusElement.textContent = "Saved.";
    } catch (error) {
      console.error("Unable to save settings.", error);
      statusElement.textContent = "Could not save settings. Try again.";
    }
  });
}
