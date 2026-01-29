import type { BootstrapLogResponse, CreateInstancePayload, InstanceListResponse, ProvisionedInstance } from "./types";

export function resolveApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envBase && envBase.trim().length > 0) {
    return envBase;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:8000";
}

export const authMode =
  (import.meta.env.VITE_AUTH_MODE as string | undefined) || "dev";

const jsonHeaders = {
  "Content-Type": "application/json",
};

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function listInstances(): Promise<InstanceListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/provision/instances`, {
    credentials: "include",
  });
  return handle<InstanceListResponse>(response);
}

export async function createInstance(payload: CreateInstancePayload): Promise<ProvisionedInstance> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/provision/instances`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<ProvisionedInstance>(response);
}

export async function getInstance(id: string, refresh = false): Promise<ProvisionedInstance> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/provision/instances/${id}`);
  if (refresh) {
    url.searchParams.set("refresh", "true");
  }
  const response = await fetch(url.toString(), { credentials: "include" });
  return handle<ProvisionedInstance>(response);
}

export async function destroyInstance(id: string): Promise<ProvisionedInstance> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/provision/instances/${id}/destroy`, {
    method: "POST",
    credentials: "include",
  });
  return handle<ProvisionedInstance>(response);
}

export async function fetchBootstrapLog(id: string, tail = 200): Promise<BootstrapLogResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/provision/instances/${id}/bootstrap-log`);
  url.searchParams.set("tail", String(tail));
  const response = await fetch(url.toString(), { credentials: "include" });
  return handle<BootstrapLogResponse>(response);
}
