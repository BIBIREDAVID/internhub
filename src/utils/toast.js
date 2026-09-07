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

const FRIENDLY_MESSAGES = {
  "permission-denied": "You don't have permission to do that.",
  unauthenticated: "Your session expired. Please sign in again.",
  unavailable: "Network issue — please check your connection and try again.",
  "not-found": "That record no longer exists.",
  "resource-exhausted": "Too many requests. Please try again shortly.",
};

export function friendlyFirestoreError(error, fallback = "Something went wrong. Please try again.") {
  const code = (error?.code || "").replace(/^firestore\//, "");
  return FRIENDLY_MESSAGES[code] || fallback;
}
