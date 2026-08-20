export function bindFloatingChrome({
  header,
  closeButton,
  postMessage = (data) => window.parent.postMessage(data, "*"),
} = {}) {
  closeButton?.addEventListener("click", () => {
    postMessage({ type: "prompt-enhancer:close" });
  });

  header?.addEventListener("pointerdown", (event) => {
    if (event.target?.closest?.("a, button")) {
      return;
    }

    postMessage({
      type: "prompt-enhancer:drag-start",
      clientX: event.clientX,
      clientY: event.clientY,
    });
  });
}
