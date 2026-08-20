export const MARGIN = 16;
export const DEFAULT_WIDTH = 380;
export const DEFAULT_HEIGHT = 560;
export const MIN_WIDTH = 300;
export const MIN_HEIGHT = 400;

export function defaultBounds(viewport) {
  const maxWidth = Math.max(MARGIN, viewport.width - MARGIN * 2);
  const maxHeight = Math.max(MARGIN, viewport.height - MARGIN * 2);
  const width = Math.min(DEFAULT_WIDTH, maxWidth);
  const height = Math.min(DEFAULT_HEIGHT, maxHeight);

  return clampBounds(
    {
      left: viewport.width - width - MARGIN,
      top: MARGIN,
      width,
      height,
    },
    viewport
  );
}

export function clampBounds(bounds, viewport) {
  const maxWidth = Math.max(MARGIN, viewport.width - MARGIN * 2);
  const maxHeight = Math.max(MARGIN, viewport.height - MARGIN * 2);
  const width = Math.min(
    Math.max(bounds.width, Math.min(MIN_WIDTH, maxWidth)),
    maxWidth
  );
  const height = Math.min(
    Math.max(bounds.height, Math.min(MIN_HEIGHT, maxHeight)),
    maxHeight
  );
  const maxLeft = viewport.width - width - MARGIN;
  const maxTop = viewport.height - height - MARGIN;

  return {
    left: Math.min(Math.max(bounds.left, MARGIN), Math.max(MARGIN, maxLeft)),
    top: Math.min(Math.max(bounds.top, MARGIN), Math.max(MARGIN, maxTop)),
    width,
    height,
  };
}

export function applyDrag(bounds, delta, viewport) {
  return clampBounds(
    {
      ...bounds,
      left: bounds.left + delta.x,
      top: bounds.top + delta.y,
    },
    viewport
  );
}

export function applyResize(bounds, delta, viewport) {
  const width = Math.min(
    Math.max(bounds.width + delta.x, MIN_WIDTH),
    Math.max(MIN_WIDTH, viewport.width - bounds.left)
  );
  const height = Math.min(
    Math.max(bounds.height + delta.y, MIN_HEIGHT),
    Math.max(MIN_HEIGHT, viewport.height - bounds.top)
  );

  return {
    ...bounds,
    width,
    height,
  };
}
