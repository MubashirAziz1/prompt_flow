import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createChromeStorageAdapter } from "../../extension/ai/settings-store.js";
import { createPopupState } from "../../extension/popup/popup-state.js";
import { createMemoryChromeStorage } from "../helpers/memory-storage.js";

describe("popup state (unit)", () => {
  it("returns empty draft and result when nothing is stored", async () => {
    const storage = createChromeStorageAdapter(createMemoryChromeStorage());
    const state = createPopupState({ storage });

    assert.deepEqual(await state.load(), { draft: "", result: "" });
  });

  it("persists draft and result so a reopened popup can restore them", async () => {
    const chromeStorage = createMemoryChromeStorage();
    const storage = createChromeStorageAdapter(chromeStorage);
    const state = createPopupState({ storage });

    await state.save({ draft: "rough notes", result: "clearer notes" });

    const restored = createPopupState({
      storage: createChromeStorageAdapter(chromeStorage),
    });
    assert.deepEqual(await restored.load(), {
      draft: "rough notes",
      result: "clearer notes",
    });
  });

  it("merges partial updates without wiping the other field", async () => {
    const storage = createChromeStorageAdapter(createMemoryChromeStorage());
    const state = createPopupState({ storage });

    await state.save({ draft: "keep me", result: "old" });
    await state.save({ result: "new refined" });

    assert.deepEqual(await state.load(), {
      draft: "keep me",
      result: "new refined",
    });
  });
});
