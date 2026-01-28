import type { BootstrapLogResponse, CreateInstancePayload, InstanceListResponse, ProvisionedInstance } from "./types";

const DEFAULT_API_BASE =
  (globalThis?.location && "origin" in globalThis.location
    ? globalThis.location.origin
    : undefined) || "http://localhost:8000";

export const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || DEFAULT_API_BASE;

export const authMode =
  (import.meta.env.VITE_AUTH_MODE as string | undefined) || "dev";

const jsonHeaders = {
  "Content-Type": "application/json",
};

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/accounts/login/?next=${next}`;
}

async function handle<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (response.redirected && response.url.includes("/accounts/login")) {
    redirectToLogin();
    throw new Error("AUTH_REQUIRED");
  }
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error("AUTH_REQUIRED");
  }
  if (response.ok && !contentType.includes("application/json")) {
    if (response.url.includes("/accounts/login")) {
      redirectToLogin();
      throw new Error("AUTH_REQUIRED");
    }
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function listInstances(): Promise<InstanceListResponse> {
  const response = await fetch(`${apiBaseUrl}/xyn/api/provision/instances`, {
    credentials: "include",
  });
  return handle<InstanceListResponse>(response);
}

export async function createInstance(payload: CreateInstancePayload): Promise<ProvisionedInstance> {
  const response = await fetch(`${apiBaseUrl}/xyn/api/provision/instances`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<ProvisionedInstance>(response);
}

export async function getInstance(id: string, refresh = false): Promise<ProvisionedInstance> {
  const url = new URL(`${apiBaseUrl}/xyn/api/provision/instances/${id}`);
  if (refresh) {
    url.searchParams.set("refresh", "true");
  }
  const response = await fetch(url.toString(), { credentials: "include" });
  return handle<ProvisionedInstance>(response);
}

export async function destroyInstance(id: string): Promise<ProvisionedInstance> {
  const response = await fetch(`${apiBaseUrl}/xyn/api/provision/instances/${id}/destroy`, {
    method: "POST",
    credentials: "include",
  });
  return handle<ProvisionedInstance>(response);
}

export async function fetchBootstrapLog(id: string, tail = 200): Promise<BootstrapLogResponse> {
  const url = new URL(`${apiBaseUrl}/xyn/api/provision/instances/${id}/bootstrap-log`);
  url.searchParams.set("tail", String(tail));
  const response = await fetch(url.toString(), { credentials: "include" });
  return handle<BootstrapLogResponse>(response);
}
