const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export function saveAuthSession(payload) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", payload.access_token);
  localStorage.setItem("access_token", payload.access_token);
  localStorage.setItem(
    "user",
    JSON.stringify({
      email: payload.email,
      role: payload.role,
      name: payload.name,
      user_id: payload.user_id,
      branch_id: payload.branch_id,
    })
  );
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    null
  );
}

function extractError(payload) {
  if (typeof payload === "string") return payload;
  return (
    payload?.error?.message ||
    payload?.detail ||
    payload?.message ||
    "Request failed."
  );
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const ct = res.headers.get("content-type") || "";
  const payload = ct.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message = extractError(payload);
    if (res.status === 401 && typeof window !== "undefined") {
      clearAuthSession();
    }
    throw new Error(message);
  }

  return payload;
}

export const apiClient = {
  login: (email, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getDashboard: () => request("/api/dashboard"),
  getSamples: () => request("/api/samples"),
  getSample: (id) => request(`/api/samples/${id}`),
  getReviews: () => request("/api/reviews"),
  getAuditLogs: () => request("/audit-logs"),

  classify: (fd) =>
    request("/api/classify", {
      method: "POST",
      body: fd,
    }),

  validate: (payload) =>
    request("/api/validate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateSampleStatus: (sampleId, payload) =>
    request(`/api/samples/${sampleId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};