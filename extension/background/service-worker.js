chrome.runtime.onInstalled.addListener(() => {
  // Foundation install hook.
});

async function enableOpenPanelOnActionClick() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.error("Unable to open the side panel from the toolbar icon.", error);
  }
}

enableOpenPanelOnActionClick();
