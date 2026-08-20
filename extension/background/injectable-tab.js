const RESTRICTED_PROTOCOLS = new Set([
  "chrome:",
  "chrome-extension:",
  "edge:",
  "about:",
  "devtools:",
  "view-source:",
  "moz-extension:",
]);

export function canInjectIntoUrl(url) {
  if (typeof url !== "string" || url.trim() === "") {
    return false;
  }

  try {
    const parsed = new URL(url);
    if (RESTRICTED_PROTOCOLS.has(parsed.protocol)) {
      return false;
    }

    const host = parsed.hostname;
    if (host === "chromewebstore.google.com") {
      return false;
    }

    if (host === "chrome.google.com" && parsed.pathname.startsWith("/webstore")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
