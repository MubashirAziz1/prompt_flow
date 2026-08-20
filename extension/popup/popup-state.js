export const POPUP_STATE_KEY = "popupState";

export function createPopupState({
  storage,
  storageKey = POPUP_STATE_KEY,
} = {}) {
  async function load() {
    const raw = await storage.get(storageKey);
    return {
      draft: String(raw?.draft ?? ""),
      result: String(raw?.result ?? ""),
    };
  }

  async function save(next = {}) {
    const current = await load();
    const merged = {
      draft: next.draft === undefined ? current.draft : String(next.draft),
      result: next.result === undefined ? current.result : String(next.result),
    };
    await storage.set(storageKey, merged);
    return merged;
  }

  return { load, save };
}
