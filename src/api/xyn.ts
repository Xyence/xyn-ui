import type {
  BlueprintCreatePayload,
  BlueprintDetail,
  BlueprintListResponse,
  BlueprintSummary,
  DevTaskDetail,
  DevTaskListResponse,
  DevTaskSummary,
  DevTaskCreatePayload,
  ModuleCreatePayload,
  ModuleDetail,
  ModuleListResponse,
  RegistryCreatePayload,
  RegistryDetail,
  RegistryListResponse,
  ReleasePlanCreatePayload,
  ReleasePlanDetail,
  ReleasePlanListResponse,
  RunArtifact,
  RunCommandExecution,
  RunDetail,
  RunListResponse,
  RunLogResponse,
} from "./types";
import { resolveApiBaseUrl } from "./client";

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

export async function listBlueprints(query = ""): Promise<BlueprintListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/blueprints`);
  if (query) {
    url.searchParams.set("q", query);
  }
  url.searchParams.set("page_size", "200");
  const response = await fetch(url.toString(), { credentials: "include" });
  return handle<BlueprintListResponse>(response);
}

export async function getBlueprint(id: string): Promise<BlueprintDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/blueprints/${id}`, {
    credentials: "include",
  });
  return handle<BlueprintDetail>(response);
}

export async function createBlueprint(payload: BlueprintCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/blueprints`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateBlueprint(id: string, payload: BlueprintCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/blueprints/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteBlueprint(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/blueprints/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function submitBlueprint(id: string): Promise<{ run_id?: string; instance_id?: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/blueprints/${id}/submit`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ run_id?: string; instance_id?: string }>(response);
}

export async function submitBlueprintWithDevTasks(id: string): Promise<{ run_id?: string; instance_id?: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/blueprints/${id}/submit?queue_dev_tasks=1`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ run_id?: string; instance_id?: string }>(response);
}

export async function listModules(query = ""): Promise<ModuleListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/modules`);
  if (query) {
    url.searchParams.set("q", query);
  }
  url.searchParams.set("page_size", "200");
  const response = await fetch(url.toString(), { credentials: "include" });
  return handle<ModuleListResponse>(response);
}

export async function getModule(ref: string): Promise<ModuleDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/modules/${ref}`, {
    credentials: "include",
  });
  return handle<ModuleDetail>(response);
}

export async function createModule(payload: ModuleCreatePayload): Promise<{ id: string; fqn?: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/modules`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string; fqn?: string }>(response);
}

export async function updateModule(id: string, payload: ModuleCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/modules/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteModule(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/modules/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function listRegistries(): Promise<RegistryListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/registries`);
  url.searchParams.set("page_size", "200");
  const response = await fetch(url.toString(), { credentials: "include" });
  return handle<RegistryListResponse>(response);
}

export async function getRegistry(id: string): Promise<RegistryDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/registries/${id}`, {
    credentials: "include",
  });
  return handle<RegistryDetail>(response);
}

export async function createRegistry(payload: RegistryCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/registries`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateRegistry(id: string, payload: RegistryCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/registries/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteRegistry(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/registries/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function syncRegistry(id: string): Promise<{ status: string; last_sync_at?: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/registries/${id}/sync`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ status: string; last_sync_at?: string }>(response);
}

export async function listReleasePlans(): Promise<ReleasePlanListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/release-plans`);
  url.searchParams.set("page_size", "200");
  const response = await fetch(url.toString(), { credentials: "include" });
  return handle<ReleasePlanListResponse>(response);
}

export async function getReleasePlan(id: string): Promise<ReleasePlanDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/release-plans/${id}`, {
    credentials: "include",
  });
  return handle<ReleasePlanDetail>(response);
}

export async function createReleasePlan(payload: ReleasePlanCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/release-plans`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateReleasePlan(id: string, payload: ReleasePlanCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/release-plans/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteReleasePlan(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/release-plans/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function generateReleasePlan(id: string): Promise<{ run_id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/release-plans/${id}/generate`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ run_id: string }>(response);
}

export async function listRuns(entity?: string, status?: string): Promise<RunListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/runs`);
  url.searchParams.set("page_size", "200");
  if (entity) {
    url.searchParams.set("entity", entity);
  }
  if (status) {
    url.searchParams.set("status", status);
  }
  const response = await fetch(url.toString(), { credentials: "include" });
  return handle<RunListResponse>(response);
}

export async function getRun(id: string): Promise<RunDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/runs/${id}`, {
    credentials: "include",
  });
  return handle<RunDetail>(response);
}

export async function getRunLogs(id: string): Promise<RunLogResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/runs/${id}/logs`, {
    credentials: "include",
  });
  return handle<RunLogResponse>(response);
}

export async function getRunArtifacts(id: string): Promise<RunArtifact[]> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/runs/${id}/artifacts`, {
    credentials: "include",
  });
  const data = await handle<{ artifacts: RunArtifact[] }>(response);
  return data.artifacts;
}

export async function getRunCommands(id: string): Promise<RunCommandExecution[]> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/runs/${id}/commands`, {
    credentials: "include",
  });
  const data = await handle<{ commands: RunCommandExecution[] }>(response);
  return data.commands;
}

export async function listDevTasks(status?: string): Promise<DevTaskListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/dev-tasks`);
  url.searchParams.set("page_size", "200");
  if (status) {
    url.searchParams.set("status", status);
  }
  const response = await fetch(url.toString(), { credentials: "include" });
  return handle<DevTaskListResponse>(response);
}

export async function createDevTask(payload: DevTaskCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/dev-tasks`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function getDevTask(id: string): Promise<DevTaskDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/dev-tasks/${id}`, {
    credentials: "include",
  });
  return handle<DevTaskDetail>(response);
}

export async function runDevTask(id: string, force = false): Promise<{ run_id: string; status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/dev-tasks/${id}/run`);
  if (force) {
    url.searchParams.set("force", "1");
  }
  const response = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
  });
  return handle<{ run_id: string; status: string }>(response);
}

export async function retryDevTask(id: string): Promise<{ run_id: string; status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/dev-tasks/${id}/retry`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ run_id: string; status: string }>(response);
}

export async function cancelDevTask(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/dev-tasks/${id}/cancel`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function listBlueprintDevTasks(id: string): Promise<{ dev_tasks: DevTaskSummary[] }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/xyn/api/blueprints/${id}/dev-tasks`, {
    credentials: "include",
  });
  return handle<{ dev_tasks: DevTaskSummary[] }>(response);
}
