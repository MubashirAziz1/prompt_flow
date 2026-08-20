import { openFloatingPanel } from "./open-floating-panel.js";

chrome.runtime.onInstalled.addListener(() => {
  // Foundation install hook.
});

chrome.action.onClicked.addListener(async (tab) => {
  await openFloatingPanel({
    tab,
    executeScript: (details) => chrome.scripting.executeScript(details),
  });
});
