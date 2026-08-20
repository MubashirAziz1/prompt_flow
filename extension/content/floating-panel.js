import {
  applyDrag,
  applyResize,
  defaultBounds,
} from "./floating-geometry.js";

export const HOST_ID = "prompt-enhancer-floating-root";

const SHELL_CSS = `
:host {
  display: block;
}
iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 10px;
  background: #F6F5F1;
  box-shadow: 0 1px 2px rgba(30, 35, 33, 0.06);
}
.glass {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: 10px;
}
.resize {
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 12px;
  height: 12px;
  padding: 0;
  border: 0;
  border-right: 2px solid #5B655F;
  border-bottom: 2px solid #5B655F;
  background: transparent;
  cursor: nwse-resize;
}
`;

function noopWindow() {
  return {
    addEventListener() {},
    removeEventListener() {},
  };
}

function applyStyle(element, bounds) {
  element.style.position = "fixed";
  element.style.left = `${bounds.left}px`;
  element.style.top = `${bounds.top}px`;
  element.style.width = `${bounds.width}px`;
  element.style.height = `${bounds.height}px`;
  element.style.zIndex = "2147483646";
}

function pagePoint(iframe, clientX, clientY) {
  const rect = iframe?.getBoundingClientRect?.() ?? { left: 0, top: 0 };
  return {
    x: rect.left + clientX,
    y: rect.top + clientY,
  };
}

export function createFloatingPanel({
  doc = document,
  win = typeof window === "undefined" ? noopWindow() : window,
  getViewport = () => ({
    width: win.innerWidth,
    height: win.innerHeight,
  }),
  getPanelUrl = () => chrome.runtime.getURL("popup/popup.html"),
} = {}) {
  let host = null;
  let iframe = null;
  let glass = null;
  let bounds = defaultBounds(getViewport());
  let drag = null;

  function teardown() {
    win.removeEventListener("pointermove", onPointerMove);
    win.removeEventListener("pointerup", onPointerUp);
    win.removeEventListener("message", onMessage);
    host?.remove();
    host = null;
    iframe = null;
    glass = null;
    drag = null;
  }

  function onMessage(event) {
    if (iframe?.contentWindow && event.source !== iframe.contentWindow) {
      return;
    }

    if (event.data?.type === "prompt-enhancer:close") {
      teardown();
      return;
    }

    if (event.data?.type === "prompt-enhancer:drag-start") {
      const point = pagePoint(iframe, event.data.clientX, event.data.clientY);
      beginInteraction("drag", point.x, point.y);
    }
  }

  function beginInteraction(mode, clientX, clientY) {
    drag = {
      mode,
      startX: clientX,
      startY: clientY,
      origin: { ...bounds },
    };
    if (glass?.style) {
      glass.style.display = "block";
    }
  }

  function onPointerMove(event) {
    if (!drag || !host) {
      return;
    }

    const delta = {
      x: event.clientX - drag.startX,
      y: event.clientY - drag.startY,
    };
    bounds =
      drag.mode === "resize"
        ? applyResize(drag.origin, delta, getViewport())
        : applyDrag(drag.origin, delta, getViewport());
    applyStyle(host, bounds);
  }

  function onPointerUp() {
    if (!drag) {
      return;
    }

    drag = null;
    if (glass?.style) {
      glass.style.display = "none";
    }
  }

  function mount() {
    bounds = defaultBounds(getViewport());
    host = doc.createElement("div");
    host.id = HOST_ID;
    host.setAttribute("data-prompt-enhancer", "floating-panel");
    applyStyle(host, bounds);

    const shadow = host.attachShadow({ mode: "open" });
    const style = doc.createElement("style");
    style.textContent = SHELL_CSS;

    iframe = doc.createElement("iframe");
    iframe.src = getPanelUrl();
    iframe.title = "Prompt Enhancer";

    glass = doc.createElement("div");
    glass.className = "glass";

    const resize = doc.createElement("button");
    resize.type = "button";
    resize.className = "resize";
    resize.setAttribute("aria-label", "Resize panel");
    resize.addEventListener("pointerdown", (event) => {
      event.preventDefault?.();
      beginInteraction("resize", event.clientX, event.clientY);
    });

    shadow.appendChild(style);
    shadow.appendChild(iframe);
    shadow.appendChild(glass);
    shadow.appendChild(resize);
    doc.documentElement.appendChild(host);

    win.addEventListener("pointermove", onPointerMove);
    win.addEventListener("pointerup", onPointerUp);
    win.addEventListener("message", onMessage);
  }

  function toggle() {
    const existing = doc.getElementById(HOST_ID);
    if (existing) {
      host = existing;
      teardown();
      return false;
    }

    mount();
    return true;
  }

  return { toggle };
}

let singleton;

export function toggleFloatingPanel() {
  singleton ??= createFloatingPanel();
  return singleton.toggle();
}
