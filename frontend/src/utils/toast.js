let listener = null;
let nextId = 0;

const toasts = [];

function notify(type, message, duration = 4000) {
  const id = ++nextId;
  const toast = { id, type, message, duration };
  toasts.push(toast);
  listener?.(toasts.slice());
  setTimeout(() => dismiss(id), duration);
  return id;
}

function dismiss(id) {
  const idx = toasts.findIndex((t) => t.id === id);
  if (idx !== -1) {
    toasts.splice(idx, 1);
    listener?.(toasts.slice());
  }
}

export const toast = {
  success: (message, duration) => notify('success', message, duration),
  error: (message, duration) => notify('error', message, duration),
  dismiss,
  subscribe: (fn) => {
    listener = fn;
    return () => { listener = null; };
  },
};
