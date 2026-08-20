(async () => {
  try {
    const { toggleFloatingPanel } = await import(
      chrome.runtime.getURL("content/floating-panel.js")
    );
    toggleFloatingPanel();
  } catch (error) {
    console.error("Unable to open the floating panel.", error);
  }
})();
