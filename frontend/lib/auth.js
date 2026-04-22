import { apiRequest } from "./api";

export async function loginUser(username, password) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username,
      password,
    }),
  });
}

export function saveAuthSession(data) {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("username", data.username);
  localStorage.setItem("full_name", data.full_name);
  localStorage.setItem("branch_id", String(data.branch_id ?? ""));
}

export function clearAuthSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
  localStorage.removeItem("full_name");
  localStorage.removeItem("branch_id");
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;

  const access_token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username");
  const full_name = localStorage.getItem("full_name");
  const branch_id = localStorage.getItem("branch_id");

  if (!access_token || !role) return null;

  return {
    access_token,
    role,
    username,
    full_name,
    branch_id,
  };
}

export function getDashboardRouteByRole(role) {
  switch (role) {
    case "Administrator":
      return "/admin";
    case "Lab Technician":
      return "/technical";
    case "Senior Technician":
      return "/technical/workflow";
    case "QA Engineer":
      return "/technical/workflow";
    case "Accounting Staff":
      return "/accounting";
    default:
      return "/access-select";
  }
}