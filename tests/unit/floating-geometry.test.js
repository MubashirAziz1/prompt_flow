import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  MARGIN,
  applyDrag,
  applyResize,
  clampBounds,
  defaultBounds,
} from "../../extension/content/floating-geometry.js";

const desktop = { width: 1280, height: 800 };

describe("floating panel geometry (unit)", () => {
  it("docks a 380x560 panel near the top-right with a page margin", () => {
    const bounds = defaultBounds(desktop);

    assert.equal(bounds.width, DEFAULT_WIDTH);
    assert.equal(bounds.height, DEFAULT_HEIGHT);
    assert.equal(bounds.top, MARGIN);
    assert.equal(bounds.left, desktop.width - DEFAULT_WIDTH - MARGIN);
  });

  it("shrinks to fit a short viewport instead of overflowing", () => {
    const bounds = defaultBounds({ width: 400, height: 420 });

    assert.ok(bounds.left >= MARGIN);
    assert.ok(bounds.top >= MARGIN);
    assert.ok(bounds.left + bounds.width <= 400 - MARGIN);
    assert.ok(bounds.top + bounds.height <= 420 - MARGIN);
  });

  it("keeps dragged panels on screen", () => {
    const start = defaultBounds(desktop);
    const moved = applyDrag(start, { x: 4000, y: -4000 }, desktop);

    assert.ok(moved.left + moved.width <= desktop.width - MARGIN);
    assert.ok(moved.top >= MARGIN);
  });

  it("grows from the bottom-right without shifting the left edge", () => {
    const start = {
      left: 884,
      top: 16,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    };
    const grown = applyResize(start, { x: 16, y: 40 }, desktop);

    assert.equal(grown.left, 884);
    assert.equal(grown.width, DEFAULT_WIDTH + 16);
    assert.equal(grown.height, DEFAULT_HEIGHT + 40);
  });

  it("resizes from the bottom-right without going below the minimum", () => {
    const start = {
      left: 100,
      top: 20,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    };
    const grown = applyResize(start, { x: 80, y: 40 }, desktop);
    assert.equal(grown.width, DEFAULT_WIDTH + 80);
    assert.equal(grown.height, DEFAULT_HEIGHT + 40);

    const shrunk = applyResize(start, { x: -400, y: -400 }, desktop);
    assert.ok(shrunk.width >= 300);
    assert.ok(shrunk.height >= 400);
  });

  it("clamps restored bounds that sit off-screen", () => {
    const restored = clampBounds(
      { left: 9000, top: 9000, width: 380, height: 560 },
      desktop
    );

    assert.ok(restored.left + restored.width <= desktop.width - MARGIN);
    assert.ok(restored.top + restored.height <= desktop.height - MARGIN);
  });
});
