export function fakeControl(value = "") {
  return {
    value,
    disabled: false,
    textContent: "",
    focused: false,
    listeners: {},
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    focus() {
      this.focused = true;
    },
  };
}

export function fakeSelect(value = "") {
  return {
    ...fakeControl(value),
    options: [],
  };
}
