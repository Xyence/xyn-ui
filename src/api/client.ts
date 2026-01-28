import type { BootstrapLogResponse, CreateInstancePayload, InstanceListResponse, ProvisionedInstance } from "./types";

const DEFAULT_API_BASE =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "http://localhost:8000";

export const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || DEFAULT_API_BASE;

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
  return response.json() as Promise<T>;
}

export function listInstances(): Promise<InstanceListResponse> {
  return fetch(`${apiBaseUrl}/xyn/api/provision/instances`, {
    credentials: "include",
  }).then(handle);
}

export function createInstance(payload: CreateInstancePayload): Promise<ProvisionedInstance> {
  return fetch(`${apiBaseUrl}/xyn/api/provision/instances`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  }).then(handle);
}

export function getInstance(id: string, refresh = false): Promise<ProvisionedInstance> {
  const url = new URL(`${apiBaseUrl}/xyn/api/provision/instances/${id}`);
  if (refresh) {
    url.searchParams.set("refresh", "true");
  }
  return fetch(url.toString(), { credentials: "include" }).then(handle);
}

export function destroyInstance(id: string): Promise<ProvisionedInstance> {
  return fetch(`${apiBaseUrl}/xyn/api/provision/instances/${id}/destroy`, {
    method: "POST",
    credentials: "include",
  }).then(handle);
}

export function fetchBootstrapLog(id: string, tail = 200): Promise<BootstrapLogResponse> {
  const url = new URL(`${apiBaseUrl}/xyn/api/provision/instances/${id}/bootstrap-log`);
  url.searchParams.set("tail", String(tail));
  return fetch(url.toString(), { credentials: "include" }).then(handle);
}
