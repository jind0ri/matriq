const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

  let testCodesCache = null;
let testCodesCacheTime = 0;

const TEST_CODES_TTL = 1000 * 60 * 10; // 10 minutes

export function isInactivePayload(payload) {
  if (!payload) return true;

  if (typeof payload.is_active === "boolean") {
    return payload.is_active === false;
  }

  if (typeof payload.active === "boolean") {
    return payload.active === false;
  }

  const status = String(payload.status || payload.account_status || "")
    .trim()
    .toLowerCase();

  if (!status) return false;

  return ["inactive", "disabled", "deactivated", "suspended"].includes(status);
}

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
      is_active: payload.is_active,
      active: payload.active,
      status: payload.status,
      account_status: payload.account_status,
    })
  );
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    clearAuthSession();
    return null;
  }
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

    if (
      (res.status === 401 || res.status === 403) &&
      typeof window !== "undefined"
    ) {
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

  forgotPassword: (payload) =>
    request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  resetPassword: (payload) =>
    request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getDashboard: () => request("/api/dashboard"),
  getSamples: () => request("/api/samples"),
  getSample: (id) => request(`/api/samples/${id}`),
  getReviews: () => request("/api/reviews"),
  getAuditLogs: () => request("/api/audit-logs"),
  getAccountingDashboard: () => request("/api/accounting/dashboard"),
  getAccountingBilling: () => request("/api/accounting/billing"),
  getAccountingInvoices: () => request("/api/accounting/invoices"),

getTestCodes: async () => {
  const now = Date.now();

  // 1. return cache if valid
  if (testCodesCache && now - testCodesCacheTime < TEST_CODES_TTL) {
    return testCodesCache;
  }

  // 2. fetch from API
  const res = await request("/api/test-codes");

  const data = Array.isArray(res)
  ? res
  : res?.test_codes || res?.data || res?.result || [];

  // 3. store cache
  testCodesCache = data;
  testCodesCacheTime = now;

  return data;
}, 

  createInvoice: (payload) =>
    request("/api/accounting/invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateInvoiceStatus: (invoiceId, payload) =>
    request(`/api/accounting/invoices/${invoiceId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getUsers: () => request("/api/users"),

  createUser: (payload) =>
    request("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateUser: (userId, payload) =>
    request(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateUserStatus: (userId, payload) =>
    request(`/api/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getAdminSettings: () => request("/api/admin/settings"),

  updateAdminSetting: (payload) =>
    request("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateAdminBranch: (branchId, payload) =>
    request(`/api/admin/branches/${branchId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getLabTechWorkflow: () => request("/api/lab-tech/workflow"),

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

  updateSampleTestData: (sampleId, payload) =>
    request(`/api/samples/${sampleId}/test-data`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateSamplePayment: (sampleId, payload) =>
    request(`/api/accounting/samples/${sampleId}/payment`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getQaPreTestingQueue: () => request("/api/qa/pre-testing"),
  getQaReleaseQueue: () => request("/api/qa/release"),

  qaApprovePreTesting: (sampleId) =>
    request(`/api/samples/${sampleId}/qa-pretesting`, {
      method: "PATCH",
    }),

  qaApproveRelease: (sampleId) =>
    request(`/api/samples/${sampleId}/qa-release`, {
      method: "PATCH",
    }),

  qaOverrideTestResult: (sampleId, payload) =>
    request(`/api/samples/${sampleId}/qa-result-override`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getNotifications: () => request("/api/notifications"),
  getUnreadNotifications: () => request("/api/notifications/unread"),
  getUnreadNotificationCount: () => request("/api/notifications/unread-count"),
  getSyncStatus: () => request("/api/sync/status"),

  clearTestCodesCache: () => {
  testCodesCache = null;
  testCodesCacheTime = 0;
},

  markNotificationRead: (notificationId) =>
    request(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    }),

  markAllNotificationsRead: () =>
    request("/api/notifications/read-all", {
      method: "PATCH",
    }),

  createFeedbackReport: (payload) =>
    request("/api/feedback", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMyFeedbackReports: () => request("/api/feedback/mine"),
  getAdminFeedbackReports: () => request("/api/feedback/admin"),

  updateFeedbackReport: (feedbackId, payload) =>
    request(`/api/feedback/${feedbackId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};