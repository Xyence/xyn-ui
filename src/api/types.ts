export type ProvisionStatus =
  | "requested"
  | "provisioning"
  | "running"
  | "ready"
  | "error"
  | "terminating"
  | "terminated";

export type ProvisionedInstance = {
  id: string;
  name: string;
  environment_id?: string | null;
  aws_region: string;
  instance_id: string | null;
  instance_type: string | null;
  ami_id: string | null;
  security_group_id: string | null;
  subnet_id: string | null;
  vpc_id: string | null;
  public_ip: string | null;
  private_ip: string | null;
  ssm_status: string | null;
  status: ProvisionStatus;
  last_error: string | null;
  desired_release_id?: string | null;
  observed_release_id?: string | null;
  observed_at?: string | null;
  last_deploy_run_id?: string | null;
  health_status?: "unknown" | "healthy" | "degraded" | "failed";
  tags?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
};

export type InstanceListResponse = {
  instances: ProvisionedInstance[];
};

export type BootstrapLogResponse = {
  instance_id: string;
  status: string;
  stdout?: string;
  stderr?: string;
};

export type ContainerInfo = {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string;
};

export type InstanceContainersResponse = {
  instance_id: string;
  status: string;
  ssm_command_id?: string;
  error?: string;
  containers: ContainerInfo[];
};

export type CreateInstancePayload = {
  name?: string;
  region?: string;
  ami_id?: string;
  instance_type?: string;
  subnet_id?: string;
  vpc_id?: string;
  key_name?: string;
  repo_url?: string;
  iam_instance_profile_arn?: string;
  iam_instance_profile_name?: string;
  environment_id?: string;
};

export type PaginatedResponse<T, K extends string> = {
  count: number;
  next: number | null;
  prev: number | null;
} & Record<K, T[]>;

export type BlueprintSummary = {
  id: string;
  name: string;
  namespace: string;
  description?: string;
  spec_text?: string;
  metadata_json?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  latest_revision?: number | null;
};

export type BlueprintDetail = BlueprintSummary & {
  spec_json?: Record<string, unknown> | null;
};

export type BlueprintCreatePayload = {
  name?: string;
  namespace?: string;
  description?: string;
  spec_json?: Record<string, unknown>;
  spec_text?: string;
  metadata_json?: Record<string, unknown> | null;
  blueprint_kind?: string;
};

export type BlueprintDraftSession = {
  id: string;
  name: string;
  status: string;
  blueprint_kind: string;
  created_at?: string;
  updated_at?: string;
};

export type BlueprintDraftSessionDetail = {
  id: string;
  blueprint_kind: string;
  status: string;
  draft?: Record<string, unknown> | null;
  requirements_summary?: string | null;
  validation_errors?: string[];
  suggested_fixes?: string[];
  job_id?: string | null;
  last_error?: string | null;
  diff_summary?: string | null;
  context_pack_refs?: Array<{
    id: string;
    name: string;
    purpose: string;
    scope: string;
    version: string;
    content_hash?: string;
    is_active?: boolean;
  }>;
  context_pack_ids?: string[];
  effective_context_hash?: string | null;
  effective_context_preview?: string | null;
};

export type BlueprintVoiceNote = {
  id: string;
  title?: string;
  status: string;
  created_at?: string;
  session_id: string;
  job_id?: string | null;
  last_error?: string | null;
  transcript_text?: string | null;
  transcript_confidence?: number | null;
};

export type BlueprintListResponse = PaginatedResponse<BlueprintSummary, "blueprints">;

export type ModuleSummary = {
  id: string;
  name: string;
  namespace: string;
  fqn: string;
  type: string;
  current_version: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type ModuleDetail = ModuleSummary & {
  latest_module_spec_json?: Record<string, unknown> | null;
};

export type ModuleCreatePayload = {
  name?: string;
  namespace?: string;
  type?: string;
  current_version?: string;
  status?: string;
  latest_module_spec_json?: Record<string, unknown>;
};

export type ModuleListResponse = PaginatedResponse<ModuleSummary, "modules">;

export type RegistrySummary = {
  id: string;
  name: string;
  registry_type: string;
  status: string;
  last_sync_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RegistryDetail = RegistrySummary & {
  description?: string;
  url?: string;
};

export type RegistryCreatePayload = {
  name?: string;
  registry_type?: string;
  description?: string;
  url?: string;
  status?: string;
};

export type RegistryListResponse = PaginatedResponse<RegistrySummary, "registries">;

export type ReleasePlanSummary = {
  id: string;
  name: string;
  target_kind: string;
  target_fqn: string;
  from_version?: string;
  to_version?: string;
  blueprint_id?: string | null;
  environment_id?: string | null;
  last_run?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ReleasePlanDetail = ReleasePlanSummary & {
  milestones_json?: Record<string, unknown> | null;
  deployments?: Array<{
    instance_id: string;
    instance_name: string;
    last_applied_hash?: string | null;
    last_applied_at?: string | null;
  }>;
};

export type ReleasePlanCreatePayload = {
  name?: string;
  target_kind?: string;
  target_fqn?: string;
  from_version?: string;
  to_version?: string;
  milestones_json?: Record<string, unknown>;
  blueprint_id?: string | null;
  environment_id?: string | null;
};

export type ReleasePlanListResponse = PaginatedResponse<ReleasePlanSummary, "release_plans">;

export type ReleaseTarget = {
  id: string;
  blueprint_id: string;
  name: string;
  environment?: string;
  target_instance_id: string;
  fqdn: string;
  dns: {
    provider: string;
    zone_name?: string;
    zone_id?: string;
    record_type?: string;
    ttl?: number;
  };
  runtime: {
    type: string;
    transport: string;
    remote_root?: string;
    compose_file_path?: string;
    mode?: string;
    image_deploy?: boolean;
  };
  tls: {
    mode: string;
    acme_email?: string;
    redirect_http_to_https?: boolean;
  };
  env?: Record<string, string>;
  secret_refs?: { name: string; ref: string }[];
  created_at?: string;
  updated_at?: string;
};

export type ReleaseTargetCreatePayload = {
  blueprint_id: string;
  name: string;
  environment?: string;
  target_instance_id: string;
  fqdn: string;
  dns?: {
    provider?: string;
    zone_name?: string;
    zone_id?: string;
    record_type?: string;
    ttl?: number;
  };
  runtime?: {
    type?: string;
    transport?: string;
    remote_root?: string;
    compose_file_path?: string;
    mode?: string;
    image_deploy?: boolean;
  };
  tls?: {
    mode?: string;
    acme_email?: string;
    redirect_http_to_https?: boolean;
  };
  env?: Record<string, string>;
  secret_refs?: { name: string; ref: string }[];
};

export type ReleaseTargetListResponse = { release_targets: ReleaseTarget[] };

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  metadata_json?: Record<string, unknown> | null;
  membership_role?: string;
  created_at?: string;
  updated_at?: string;
};

export type TenantListResponse = { tenants: Tenant[]; count?: number; next?: number | null; prev?: number | null };

export type TenantCreatePayload = {
  name?: string;
  slug?: string;
  status?: string;
  metadata_json?: Record<string, unknown> | null;
};

export type Contact = {
  id: string;
  tenant_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role_title?: string | null;
  status: string;
  metadata_json?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type ContactListResponse = { contacts: Contact[] };

export type ContactCreatePayload = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  role_title?: string | null;
  status?: string;
  metadata_json?: Record<string, unknown> | null;
};

export type IdentitySummary = {
  id: string;
  provider: string;
  issuer: string;
  subject: string;
  email?: string | null;
  display_name?: string | null;
  last_login_at?: string | null;
};

export type IdentityListResponse = { identities: IdentitySummary[] };

export type RoleBindingSummary = {
  id: string;
  user_identity_id: string;
  scope_kind: string;
  scope_id?: string | null;
  role: string;
  created_at?: string;
};

export type RoleBindingListResponse = { role_bindings: RoleBindingSummary[] };

export type RoleBindingCreatePayload = {
  user_identity_id: string;
  role: string;
};

export type MembershipSummary = {
  id: string;
  tenant_id: string;
  user_identity_id: string;
  role: string;
  status: string;
  user_email?: string | null;
  user_display_name?: string | null;
};

export type MembershipListResponse = { memberships: MembershipSummary[] };

export type MembershipCreatePayload = {
  user_identity_id: string;
  role: string;
};

export type MyProfile = {
  user: {
    issuer: string;
    subject: string;
    email?: string | null;
    display_name?: string | null;
  };
  roles: string[];
  memberships: Array<{
    tenant_id: string;
    tenant_name: string;
    role: string;
  }>;
};

export type BrandingPayload = {
  display_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  theme_json?: Record<string, string>;
};

export type BrandingResponse = {
  display_name: string;
  logo_url: string;
  theme: Record<string, string>;
};

export type Device = {
  id: string;
  tenant_id: string;
  name: string;
  device_type: string;
  mgmt_ip?: string | null;
  status: string;
  tags?: Record<string, unknown> | null;
  metadata_json?: Record<string, unknown> | null;
};

export type DeviceListResponse = { devices: Device[] };

export type DevicePayload = {
  name?: string;
  device_type?: string;
  mgmt_ip?: string | null;
  status?: string;
  tags?: Record<string, unknown> | null;
  metadata_json?: Record<string, unknown> | null;
};

export type ReleaseSummary = {
  id: string;
  version: string;
  status: string;
  blueprint_id?: string | null;
  release_plan_id?: string | null;
  created_from_run_id?: string | null;
  environment_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ReleaseDetail = ReleaseSummary & {
  artifacts_json?: Array<{ name: string; url: string }> | null;
};

export type ReleaseCreatePayload = {
  version: string;
  status?: string;
  blueprint_id?: string | null;
  release_plan_id?: string | null;
  created_from_run_id?: string | null;
  environment_id?: string | null;
  artifacts_json?: Array<{ name: string; url: string }>;
};

export type ReleaseListResponse = PaginatedResponse<ReleaseSummary, "releases">;

export type EnvironmentSummary = {
  id: string;
  name: string;
  slug: string;
  base_domain?: string | null;
  aws_region?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type EnvironmentListResponse = PaginatedResponse<EnvironmentSummary, "environments">;

export type EnvironmentCreatePayload = {
  name?: string;
  slug?: string;
  base_domain?: string;
  aws_region?: string;
};

export type RunSummary = {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  summary?: string;
  created_at?: string;
  started_at?: string;
  finished_at?: string;
};

export type ContextPackRef = {
  id?: string;
  name?: string;
  purpose?: string;
  scope?: string;
  version?: string;
  content_hash?: string;
};

export type RunDetail = RunSummary & {
  error?: string;
  log_text?: string;
  metadata?: Record<string, unknown> | null;
  context_pack_refs?: Array<string | ContextPackRef> | null;
};

export type RunListResponse = PaginatedResponse<RunSummary, "runs">;

export type RunLogResponse = {
  log?: string;
  error?: string;
};

export type RunArtifact = {
  id: string;
  name: string;
  kind?: string;
  url?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

export type RunCommandExecution = {
  id: string;
  step_name?: string;
  command_index?: number;
  shell?: string;
  status?: string;
  exit_code?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  ssm_command_id?: string | null;
  stdout?: string;
  stderr?: string;
};

export type DevTaskSummary = {
  id: string;
  title: string;
  task_type: string;
  status: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  locked_by?: string | null;
  locked_at?: string | null;
  source_entity_type?: string;
  source_entity_id?: string;
  source_run?: string | null;
  result_run?: string | null;
  context_purpose?: string;
  target_instance_id?: string | null;
  force?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type DevTaskDetail = DevTaskSummary & {
  input_artifact_key?: string;
  last_error?: string;
  context_packs?: Array<{
    id: string;
    name: string;
    purpose: string;
    scope: string;
    version: string;
  }>;
  result_run_detail?: {
    id: string;
    status?: string;
    summary?: string;
    error?: string;
    log_text?: string;
    started_at?: string | null;
    finished_at?: string | null;
  } | null;
  result_run_artifacts?: Array<{
    id: string;
    name: string;
    kind?: string;
    url?: string;
    metadata?: Record<string, unknown> | null;
    created_at?: string;
  }>;
  result_run_commands?: RunCommandExecution[];
  force?: boolean;
};

export type DevTaskListResponse = PaginatedResponse<DevTaskSummary, "dev_tasks">;

export type DevTaskCreatePayload = {
  title: string;
  task_type: string;
  status?: string;
  priority?: number;
  max_attempts?: number;
  source_entity_type?: string;
  source_entity_id?: string;
  source_run_id?: string | null;
  input_artifact_key?: string;
  context_purpose?: string;
  target_instance_id?: string | null;
  context_pack_ids?: string[];
  force?: boolean;
  release_id?: string | null;
};

export type ContextPackSummary = {
  id: string;
  name: string;
  purpose: string;
  scope: string;
  namespace?: string;
  project_key?: string;
  version: string;
  is_active: boolean;
  is_default: boolean;
  applies_to_json?: Record<string, unknown>;
  updated_at?: string;
};

export type ContextPackDetail = ContextPackSummary & {
  content_markdown?: string;
};

export type ContextPackListResponse = {
  context_packs: ContextPackSummary[];
};

export type ContextPackCreatePayload = {
  name: string;
  purpose?: string;
  scope?: string;
  namespace?: string;
  project_key?: string;
  version: string;
  is_active?: boolean;
  is_default?: boolean;
  content_markdown: string;
  applies_to_json?: Record<string, unknown>;
};
