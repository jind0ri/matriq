import { apiClient } from "@/services/apiClient";

export async function fetchSamples() {
  const data = await apiClient.getSamples();
  return Array.isArray(data) ? data : [];
}