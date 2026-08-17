export const SETTINGS_STORAGE_KEY = "aiSettings";

export function createChromeStorageAdapter(chromeStorage) {
  return {
    async get(key) {
      const result = await chromeStorage.local.get(key);
      return result[key];
    },
    async set(key, value) {
      await chromeStorage.local.set({ [key]: value });
    },
  };
}

export function createSettingsStore({
  storage,
  storageKey = SETTINGS_STORAGE_KEY,
} = {}) {
  async function load() {
    const raw = await storage.get(storageKey);
    return normalizeSettings(raw);
  }

  async function save(next) {
    const current = await load();
    const merged = mergeSettings(current, next);
    await storage.set(storageKey, merged);
    return merged;
  }

  return { load, save };
}

function normalizeSettings(raw) {
  return {
    apiKeys: { ...(raw?.apiKeys ?? {}) },
  };
}

function mergeSettings(current, next = {}) {
  return {
    apiKeys: mergeKeyedStrings(current.apiKeys, next.apiKeys),
  };
}

function mergeKeyedStrings(current, next) {
  if (next == null) {
    return { ...current };
  }

  let merged = { ...current };

  for (const [id, value] of Object.entries(next)) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) {
      merged = { ...merged, [id]: trimmed };
      continue;
    }

    const { [id]: _removed, ...rest } = merged;
    merged = rest;
  }

  return merged;
}
