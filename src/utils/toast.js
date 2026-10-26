const listeners = new Set();
let nextId = 1;

export function subscribeToast(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(toast) {
  const id = nextId++;
  listeners.forEach((listener) => listener({ id, ...toast }));
  return id;
}

export function notifyError(message) {
  return emit({ type: "error", message });
}

export function notifySuccess(message) {
  return emit({ type: "success", message });
}

const FRIENDLY_STATUS_MESSAGES = {
  401: "Your session expired. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "That record no longer exists.",
  429: "Too many requests. Please try again shortly.",
};

export function friendlyApiError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  return FRIENDLY_STATUS_MESSAGES[error.status] || error.message || fallback;
}
