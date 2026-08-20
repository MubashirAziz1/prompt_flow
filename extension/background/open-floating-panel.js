import { canInjectIntoUrl } from "./injectable-tab.js";

function isRestrictedPageError(error) {
  const message = String(error?.message ?? error);
  return /Cannot access a chrome:\/\//i.test(message)
    || /Cannot access contents of url/i.test(message)
    || /The extensions gallery cannot be scripted/i.test(message);
}

export async function openFloatingPanel({
  tab,
  executeScript,
  logError = console.error,
}) {
  if (tab?.id == null) {
    return;
  }

  if (!canInjectIntoUrl(tab.url ?? tab.pendingUrl ?? "")) {
    return;
  }

  try {
    await executeScript({
      target: { tabId: tab.id },
      files: ["content/loader.js"],
    });
  } catch (error) {
    if (isRestrictedPageError(error)) {
      return;
    }

    logError("Unable to open the floating panel on this page.", error);
  }
}
