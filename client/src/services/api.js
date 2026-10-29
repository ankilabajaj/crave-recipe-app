let csrf = null;
export function setCsrf(value) {
  csrf = value;
}
export async function api(path, { method = "GET", body, signal } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    signal,
    headers: {
      ...(method !== "GET"
        ? { "Content-Type": "application/json", "X-CSRF-Token": csrf || "" }
        : {}),
    },
    ...(method !== "GET" ? { body: JSON.stringify(body || {}) } : {}),
  });
  const data = await response
    .json()
    .catch(() => ({ error: "Unexpected server response." }));
  if (!response.ok) {
    const e = Object.assign(Error(data.error || "Request failed."), {
      status: response.status,
    });
    if (response.status === 401)
      window.dispatchEvent(new Event("crave:unauthorized"));
    throw e;
  }
  return data;
}
export const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
