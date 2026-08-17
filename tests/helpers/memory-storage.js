export function createMemoryStorage(initial = {}) {
  let data = { ...initial };

  return {
    async get(key) {
      return data[key];
    },
    async set(key, value) {
      data = { ...data, [key]: value };
    },
    snapshot() {
      return { ...data };
    },
  };
}

export function createMemoryChromeStorage(initial = {}) {
  let data = { ...initial };

  return {
    local: {
      async get(keys) {
        if (keys == null) {
          return { ...data };
        }

        if (typeof keys === "string") {
          return { [keys]: data[keys] };
        }

        if (Array.isArray(keys)) {
          const result = {};
          for (const key of keys) {
            result[key] = data[key];
          }
          return result;
        }

        const result = { ...keys };
        for (const key of Object.keys(keys)) {
          if (Object.hasOwn(data, key)) {
            result[key] = data[key];
          }
        }
        return result;
      },
      async set(items) {
        data = { ...data, ...items };
      },
    },
    snapshot() {
      return { ...data };
    },
  };
}
