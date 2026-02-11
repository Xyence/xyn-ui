import type {
  BlueprintCreatePayload,
  BlueprintDetail,
  BlueprintListResponse,
  BlueprintSummary,
  BlueprintDraftSession,
  BlueprintDraftSessionDetail,
  BlueprintVoiceNote,
  DevTaskDetail,
  DevTaskListResponse,
  DevTaskSummary,
  DevTaskCreatePayload,
  EnvironmentCreatePayload,
  EnvironmentListResponse,
  ModuleCreatePayload,
  ModuleDetail,
  ModuleListResponse,
  RegistryCreatePayload,
  RegistryDetail,
  RegistryListResponse,
  ReleasePlanCreatePayload,
  ReleasePlanDetail,
  ReleasePlanListResponse,
  ReleaseCreatePayload,
  ReleaseDetail,
  ReleaseListResponse,
  ReleaseSummary,
  ReleaseTarget,
  ReleaseTargetCreatePayload,
  ReleaseTargetListResponse,
  RunArtifact,
  RunCommandExecution,
  RunDetail,
  RunListResponse,
  RunLogResponse,
  ContextPackCreatePayload,
  ContextPackDetail,
  ContextPackListResponse,
  Tenant,
  TenantCreatePayload,
  TenantListResponse,
  Contact,
  ContactCreatePayload,
  ContactListResponse,
  IdentityListResponse,
  IdentityProviderListResponse,
  IdentityProviderPayload,
  OidcAppClientListResponse,
  OidcAppClientPayload,
  RoleBindingListResponse,
  RoleBindingCreatePayload,
  MembershipListResponse,
  MembershipCreatePayload,
  MyProfile,
  BrandingPayload,
  BrandingResponse,
  DeviceListResponse,
  DevicePayload,
  Device,
} from "./types";
import { authHeaders, resolveApiBaseUrl } from "./client";

const jsonHeaders = {
  "Content-Type": "application/json",
};

const buildHeaders = (extra?: Record<string, string>) => ({
  ...jsonHeaders,
  ...authHeaders(),
  ...(extra || {}),
});

function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = { ...authHeaders(), ...(init.headers || {}) } as Record<string, string>;
  return fetch(input, { ...init, headers });
}

async function handle<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const message = await response.text();
    if (message.includes("<!DOCTYPE") || message.includes("<html")) {
      throw new Error("Not authenticated. Please sign in.");
    }
    throw new Error(message || `Request failed (${response.status})`);
  }
  if (response.status === 204) {
    return {} as T;
  }
  if (!contentType.includes("application/json")) {
    const message = await response.text();
    if (message.includes("<!DOCTYPE") || message.includes("<html")) {
      throw new Error("Not authenticated. Please sign in.");
    }
    throw new Error(message || "Unexpected response format.");
  }
  return (await response.json()) as T;
}

export async function getWhoAmI(): Promise<{ authenticated: boolean; username?: string; email?: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/auth/whoami`, {
    credentials: "include",
  });
  return handle<{ authenticated: boolean; username?: string; email?: string }>(response);
}

export async function getMe(): Promise<{ user: Record<string, string | null>; roles: string[] }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/me`, { credentials: "include" });
  return handle<{ user: Record<string, string | null>; roles: string[] }>(response);
}

export async function getMyProfile(): Promise<MyProfile> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/my/profile`, { credentials: "include" });
  return handle<MyProfile>(response);
}

export async function getTenantBranding(tenantId: string): Promise<BrandingResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/tenants/${tenantId}/branding`, {
    credentials: "include",
  });
  return handle<BrandingResponse>(response);
}

export async function updateTenantBranding(tenantId: string, payload: BrandingPayload): Promise<void> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/tenants/${tenantId}/branding`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  await handle<void>(response);
}

export async function setActiveTenant(tenantId: string): Promise<void> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/my/active-tenant`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify({ tenant_id: tenantId }),
  });
  await handle<void>(response);
}

export async function listTenantDevices(): Promise<DeviceListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/tenant/devices`, {
    credentials: "include",
  });
  return handle<DeviceListResponse>(response);
}

export async function createDevice(payload: DevicePayload): Promise<Device> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/tenant/devices`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<Device>(response);
}

export async function updateDevice(id: string, payload: DevicePayload): Promise<Device> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/devices/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<Device>(response);
}

export async function deleteDevice(id: string): Promise<void> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/devices/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await handle<void>(response);
}

export async function listBlueprints(query = ""): Promise<BlueprintListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/blueprints`);
  if (query) {
    url.searchParams.set("q", query);
  }
  url.searchParams.set("page_size", "200");
  const response = await apiFetch(url.toString(), { credentials: "include" });
  return handle<BlueprintListResponse>(response);
}

export async function getBlueprint(id: string): Promise<BlueprintDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/blueprints/${id}`, {
    credentials: "include",
  });
  return handle<BlueprintDetail>(response);
}

export async function createBlueprint(payload: BlueprintCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/blueprints`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateBlueprint(id: string, payload: BlueprintCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/blueprints/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function listTenants(): Promise<TenantListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/tenants`, { credentials: "include" });
  return handle<TenantListResponse>(response);
}

export async function listVisibleTenants(): Promise<TenantListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/tenants`, { credentials: "include" });
  return handle<TenantListResponse>(response);
}

export async function createTenant(payload: TenantCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/tenants`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateTenant(id: string, payload: Partial<TenantCreatePayload>): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/tenants/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteTenant(id: string): Promise<void> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/tenants/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await handle<void>(response);
}

export async function listContacts(tenantId: string): Promise<ContactListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/tenants/${tenantId}/contacts`, {
    credentials: "include",
  });
  return handle<ContactListResponse>(response);
}

export async function createContact(tenantId: string, payload: ContactCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/tenants/${tenantId}/contacts`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateContact(id: string, payload: Partial<ContactCreatePayload>): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/contacts/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteContact(id: string): Promise<void> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/contacts/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await handle<void>(response);
}

export async function listIdentities(): Promise<IdentityListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/identities`, {
    credentials: "include",
  });
  return handle<IdentityListResponse>(response);
}

export async function listRoleBindings(identityId?: string): Promise<RoleBindingListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/internal/role_bindings`);
  if (identityId) {
    url.searchParams.set("identity_id", identityId);
  }
  const response = await apiFetch(url.toString(), { credentials: "include" });
  return handle<RoleBindingListResponse>(response);
}

export async function createRoleBinding(payload: RoleBindingCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/role_bindings`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteRoleBinding(id: string): Promise<void> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/role_bindings/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await handle<void>(response);
}

export async function listMemberships(tenantId: string): Promise<MembershipListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/tenants/${tenantId}/memberships`, {
    credentials: "include",
  });
  return handle<MembershipListResponse>(response);
}

export async function createMembership(
  tenantId: string,
  payload: MembershipCreatePayload
): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/tenants/${tenantId}/memberships`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateMembership(id: string, payload: Partial<MembershipCreatePayload>): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/memberships/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteMembership(id: string): Promise<void> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/internal/memberships/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await handle<void>(response);
}

export async function listBlueprintDraftSessions(
  blueprintId: string
): Promise<{ sessions: BlueprintDraftSession[] }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/blueprints/${blueprintId}/draft-sessions`, {
    credentials: "include",
  });
  return handle<{ sessions: BlueprintDraftSession[] }>(response);
}

export async function listReleaseTargets(blueprintId?: string): Promise<ReleaseTargetListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/release-targets`);
  if (blueprintId) {
    url.searchParams.set("blueprint_id", blueprintId);
  }
  const response = await apiFetch(url.toString(), { credentials: "include" });
  return handle<ReleaseTargetListResponse>(response);
}

export async function createReleaseTarget(payload: ReleaseTargetCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/release-targets`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function getReleaseTarget(id: string): Promise<ReleaseTarget> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/release-targets/${id}`, {
    credentials: "include",
  });
  return handle<ReleaseTarget>(response);
}

export async function updateReleaseTarget(
  id: string,
  payload: Partial<ReleaseTargetCreatePayload>
): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/release-targets/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteReleaseTarget(id: string): Promise<void> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/release-targets/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await handle<void>(response);
}

export async function createBlueprintDraftSession(
  blueprintId: string,
  payload: { name?: string; blueprint_kind?: string; context_pack_ids?: string[] }
): Promise<{ session_id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/blueprints/${blueprintId}/draft-sessions`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ session_id: string }>(response);
}

export async function getDraftSession(sessionId: string): Promise<BlueprintDraftSessionDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/draft-sessions/${sessionId}`, {
    credentials: "include",
  });
  return handle<BlueprintDraftSessionDetail>(response);
}

export async function enqueueDraftGeneration(
  sessionId: string
): Promise<{ status: string; job_id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(
    `${apiBaseUrl}/xyn/api/draft-sessions/${sessionId}/enqueue-draft-generation`,
    {
      method: "POST",
      credentials: "include",
    }
  );
  return handle<{ status: string; job_id: string }>(response);
}

export async function enqueueDraftRevision(
  sessionId: string,
  payload: { instruction?: string }
): Promise<{ status: string; job_id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(
    `${apiBaseUrl}/xyn/api/draft-sessions/${sessionId}/enqueue-draft-revision`,
    {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(payload ?? {}),
    }
  );
  return handle<{ status: string; job_id: string }>(response);
}

export async function resolveDraftSessionContext(
  sessionId: string,
  payload: { context_pack_ids?: string[] } = {}
): Promise<{ context_pack_refs: unknown[]; effective_context_hash?: string; effective_context_preview?: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/draft-sessions/${sessionId}/resolve-context`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{
    context_pack_refs: unknown[];
    effective_context_hash?: string;
    effective_context_preview?: string;
  }>(response);
}

export async function saveDraftSession(
  sessionId: string,
  payload: { draft_json: Record<string, unknown> }
): Promise<{ status: string; validation_errors: string[] }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/draft-sessions/${sessionId}/save`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ status: string; validation_errors: string[] }>(response);
}

export async function publishDraftSession(
  sessionId: string
): Promise<{ ok: boolean; entity_type?: string; entity_id?: string; revision?: number }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/draft-sessions/${sessionId}/publish`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ ok: boolean; entity_type?: string; entity_id?: string; revision?: number }>(response);
}

export async function listBlueprintVoiceNotes(
  blueprintId: string
): Promise<{ voice_notes: BlueprintVoiceNote[] }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/blueprints/${blueprintId}/voice-notes`, {
    credentials: "include",
  });
  return handle<{ voice_notes: BlueprintVoiceNote[] }>(response);
}

export async function uploadVoiceNote(
  file: File,
  payload: { session_id?: string; title?: string; language_code?: string }
): Promise<{ voice_note_id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const form = new FormData();
  form.append("file", file);
  if (payload.session_id) form.append("session_id", payload.session_id);
  if (payload.title) form.append("title", payload.title);
  if (payload.language_code) form.append("language_code", payload.language_code);
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/voice-notes`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return handle<{ voice_note_id: string }>(response);
}

export async function enqueueVoiceNoteTranscription(
  voiceNoteId: string
): Promise<{ status: string; job_id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/voice-notes/${voiceNoteId}/enqueue-transcription`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ status: string; job_id: string }>(response);
}

export async function deleteBlueprint(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/blueprints/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function submitBlueprint(
  id: string,
  releaseTargetId?: string
): Promise<{ run_id?: string; instance_id?: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/blueprints/${id}/submit`, {
    method: "POST",
    credentials: "include",
    headers: releaseTargetId ? buildHeaders() : undefined,
    body: releaseTargetId ? JSON.stringify({ release_target_id: releaseTargetId }) : undefined,
  });
  return handle<{ run_id?: string; instance_id?: string }>(response);
}

export async function submitBlueprintWithDevTasks(
  id: string,
  releaseTargetId?: string
): Promise<{ run_id?: string; instance_id?: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/blueprints/${id}/submit?queue_dev_tasks=1`, {
    method: "POST",
    credentials: "include",
    headers: releaseTargetId ? buildHeaders() : undefined,
    body: releaseTargetId ? JSON.stringify({ release_target_id: releaseTargetId }) : undefined,
  });
  return handle<{ run_id?: string; instance_id?: string }>(response);
}

export async function listContextPacks(params: {
  scope?: string;
  purpose?: string;
  namespace?: string;
  project_key?: string;
  active?: boolean;
} = {}): Promise<ContextPackListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/context-packs`);
  if (params.scope) url.searchParams.set("scope", params.scope);
  if (params.purpose) url.searchParams.set("purpose", params.purpose);
  if (params.namespace) url.searchParams.set("namespace", params.namespace);
  if (params.project_key) url.searchParams.set("project_key", params.project_key);
  if (params.active !== undefined) url.searchParams.set("active", params.active ? "1" : "0");
  const response = await apiFetch(url.toString(), { credentials: "include" });
  return handle<ContextPackListResponse>(response);
}

export async function getContextPack(id: string): Promise<ContextPackDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/context-packs/${id}`, {
    credentials: "include",
  });
  return handle<ContextPackDetail>(response);
}

export async function createContextPack(payload: ContextPackCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/context-packs`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateContextPack(
  id: string,
  payload: Partial<ContextPackCreatePayload>
): Promise<ContextPackDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/context-packs/${id}`, {
    method: "PUT",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<ContextPackDetail>(response);
}

export async function activateContextPack(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/context-packs/${id}/activate`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function deactivateContextPack(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/context-packs/${id}/deactivate`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function listModules(query = ""): Promise<ModuleListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/modules`);
  if (query) {
    url.searchParams.set("q", query);
  }
  url.searchParams.set("page_size", "200");
  const response = await apiFetch(url.toString(), { credentials: "include" });
  return handle<ModuleListResponse>(response);
}

export async function getModule(ref: string): Promise<ModuleDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/modules/${ref}`, {
    credentials: "include",
  });
  return handle<ModuleDetail>(response);
}

export async function createModule(payload: ModuleCreatePayload): Promise<{ id: string; fqn?: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/modules`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string; fqn?: string }>(response);
}

export async function updateModule(id: string, payload: ModuleCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/modules/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteModule(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/modules/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function listRegistries(): Promise<RegistryListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/registries`);
  url.searchParams.set("page_size", "200");
  const response = await apiFetch(url.toString(), { credentials: "include" });
  return handle<RegistryListResponse>(response);
}

export async function getRegistry(id: string): Promise<RegistryDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/registries/${id}`, {
    credentials: "include",
  });
  return handle<RegistryDetail>(response);
}

export async function createRegistry(payload: RegistryCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/registries`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateRegistry(id: string, payload: RegistryCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/registries/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteRegistry(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/registries/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function syncRegistry(id: string): Promise<{ status: string; last_sync_at?: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/registries/${id}/sync`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ status: string; last_sync_at?: string }>(response);
}

export async function listReleasePlans(): Promise<ReleasePlanListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/release-plans`);
  url.searchParams.set("page_size", "200");
  const response = await apiFetch(url.toString(), { credentials: "include" });
  return handle<ReleasePlanListResponse>(response);
}

export async function markReleasePlanDeployment(
  id: string,
  payload: { instance_id: string; last_applied_at?: string }
): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/release-plans/${id}/deployments`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ status: string }>(response);
}

export async function getReleasePlan(id: string): Promise<ReleasePlanDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/release-plans/${id}`, {
    credentials: "include",
  });
  return handle<ReleasePlanDetail>(response);
}

export async function createReleasePlan(payload: ReleasePlanCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/release-plans`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateReleasePlan(id: string, payload: ReleasePlanCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/release-plans/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteReleasePlan(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/release-plans/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function generateReleasePlan(id: string): Promise<{ run_id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/release-plans/${id}/generate`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ run_id: string }>(response);
}

export async function listRuns(
  entity?: string,
  status?: string,
  query?: string,
  page?: number,
  pageSize?: number
): Promise<RunListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/runs`);
  url.searchParams.set("page_size", String(pageSize ?? 50));
  if (page) {
    url.searchParams.set("page", String(page));
  }
  if (entity) {
    url.searchParams.set("entity", entity);
  }
  if (status) {
    url.searchParams.set("status", status);
  }
  if (query) {
    url.searchParams.set("q", query);
  }
  const response = await apiFetch(url.toString(), { credentials: "include" });
  return handle<RunListResponse>(response);
}

export async function listReleases(
  blueprintId?: string,
  status?: string
): Promise<ReleaseListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/releases`);
  url.searchParams.set("page_size", "200");
  if (blueprintId) {
    url.searchParams.set("blueprint_id", blueprintId);
  }
  if (status) {
    url.searchParams.set("status", status);
  }
  const response = await apiFetch(url.toString(), { credentials: "include" });
  return handle<ReleaseListResponse>(response);
}

export async function listEnvironments(): Promise<EnvironmentListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/environments`);
  url.searchParams.set("page_size", "200");
  const response = await apiFetch(url.toString(), { credentials: "include" });
  return handle<EnvironmentListResponse>(response);
}

export async function createEnvironment(
  payload: EnvironmentCreatePayload
): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/environments`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateEnvironment(
  id: string,
  payload: EnvironmentCreatePayload
): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/environments/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteEnvironment(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/environments/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function getRelease(id: string): Promise<ReleaseDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/releases/${id}`, {
    credentials: "include",
  });
  return handle<ReleaseDetail>(response);
}

export async function createRelease(payload: ReleaseCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/releases`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateRelease(id: string, payload: Partial<ReleaseSummary>): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/releases/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function getRun(id: string): Promise<RunDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/runs/${id}`, {
    credentials: "include",
  });
  return handle<RunDetail>(response);
}

export async function getRunLogs(id: string): Promise<RunLogResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/runs/${id}/logs`, {
    credentials: "include",
  });
  return handle<RunLogResponse>(response);
}

export async function getRunArtifacts(id: string): Promise<RunArtifact[]> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/runs/${id}/artifacts`, {
    credentials: "include",
  });
  const data = await handle<{ artifacts: RunArtifact[] }>(response);
  return data.artifacts;
}

export async function getRunCommands(id: string): Promise<RunCommandExecution[]> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/runs/${id}/commands`, {
    credentials: "include",
  });
  const data = await handle<{ commands: RunCommandExecution[] }>(response);
  return data.commands;
}

export async function listDevTasks(
  status?: string,
  query?: string,
  page?: number,
  pageSize?: number
): Promise<DevTaskListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/xyn/api/dev-tasks`);
  url.searchParams.set("page_size", String(pageSize ?? 50));
  if (page) {
    url.searchParams.set("page", String(page));
  }
  if (status) {
    url.searchParams.set("status", status);
  }
  if (query) {
    url.searchParams.set("q", query);
  }
  const response = await apiFetch(url.toString(), { credentials: "include" });
  return handle<DevTaskListResponse>(response);
}

export async function createDevTask(payload: DevTaskCreatePayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/dev-tasks`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function getDevTask(id: string): Promise<DevTaskDetail> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/dev-tasks/${id}`, {
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
  const response = await apiFetch(url.toString(), {
    method: "POST",
    credentials: "include",
  });
  return handle<{ run_id: string; status: string }>(response);
}

export async function retryDevTask(id: string): Promise<{ run_id: string; status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/dev-tasks/${id}/retry`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ run_id: string; status: string }>(response);
}

export async function cancelDevTask(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/dev-tasks/${id}/cancel`, {
    method: "POST",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function listBlueprintDevTasks(id: string): Promise<{ dev_tasks: DevTaskSummary[] }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/blueprints/${id}/dev-tasks`, {
    credentials: "include",
  });
  return handle<{ dev_tasks: DevTaskSummary[] }>(response);
}

export async function listIdentityProviders(): Promise<IdentityProviderListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/platform/identity-providers`, {
    credentials: "include",
  });
  return handle<IdentityProviderListResponse>(response);
}

export async function createIdentityProvider(payload: IdentityProviderPayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/platform/identity-providers`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateIdentityProvider(
  id: string,
  payload: Partial<IdentityProviderPayload>
): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/platform/identity-providers/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteIdentityProvider(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/platform/identity-providers/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}

export async function testIdentityProvider(id: string): Promise<{
  ok: boolean;
  authorization_endpoint?: string;
  token_endpoint?: string;
  jwks_uri?: string;
}> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/platform/identity-providers/${id}/test`, {
    credentials: "include",
  });
  return handle(response);
}

export async function listOidcAppClients(): Promise<OidcAppClientListResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/platform/oidc-app-clients`, {
    credentials: "include",
  });
  return handle<OidcAppClientListResponse>(response);
}

export async function createOidcAppClient(payload: OidcAppClientPayload): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/platform/oidc-app-clients`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function updateOidcAppClient(
  id: string,
  payload: Partial<OidcAppClientPayload>
): Promise<{ id: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/platform/oidc-app-clients/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ id: string }>(response);
}

export async function deleteOidcAppClient(id: string): Promise<{ status: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await apiFetch(`${apiBaseUrl}/xyn/api/platform/oidc-app-clients/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<{ status: string }>(response);
}
