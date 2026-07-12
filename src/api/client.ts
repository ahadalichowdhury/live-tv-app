import type {
  MobileChannelsResponse,
  MobileConfigResponse,
} from "../types";

function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  // Default: your deployed Go API (same server as admin/web).
  return "https://proxy.previewcloud.cloud";
}

const API_BASE_URL = getApiBaseUrl();

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export function getConfiguredApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function fetchMobileConfig(): Promise<MobileConfigResponse> {
  return fetchJson<MobileConfigResponse>("/mobile/config");
}

export async function fetchMobileChannels(): Promise<MobileChannelsResponse> {
  return fetchJson<MobileChannelsResponse>("/mobile/channels");
}
