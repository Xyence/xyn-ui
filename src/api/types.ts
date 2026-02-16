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
  active_draft_count?: number;
};

export type BlueprintDetail = BlueprintSummary & {
  spec_json?: Record<string, unknown> | null;
};

export type BlueprintIntentTranscript = {
  id: string;
  ref?: string;
  text?: string;
  sha256?: string;
  createdAt?: string;
};

export type BlueprintIntentRequirements = {
  summary: string;
  functional: string[];
  ui: string[];
  dataModel: string[];
  operational: string[];
  definitionOfDone: string[];
};

export type BlueprintIntent = {
  sourceDraftSessionId: string;
  createdFrom: { type: "draft"; id: string };
  prompt: { text: string; sha256: string; createdAt: string };
  transcripts?: BlueprintIntentTranscript[];
  requirements: BlueprintIntentRequirements;
  codegen?: {
    repoTarget?: { name?: string; url?: string; ref?: string; pathRoot?: string };
    layout?: { apiPath?: string; webPath?: string };
  };
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
  title?: string;
  kind?: "blueprint" | "solution";
  status: string;
  blueprint_kind: string;
  namespace?: string | null;
  project_key?: string | null;
  blueprint_id?: string | null;
  linked_blueprint_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BlueprintDraftSessionDetail = {
  id: string;
  title?: string;
  kind?: "blueprint" | "solution";
  blueprint_kind: string;
  status: string;
  draft?: Record<string, unknown> | null;
  namespace?: string | null;
  project_key?: string | null;
  initial_prompt?: string;
  initial_prompt_locked?: boolean;
  revision_instruction?: string;
  source_artifacts?: Array<{
    type: "text" | "audio_transcript";
    content: string;
    meta?: Record<string, unknown>;
  }>;
  has_generated_output?: boolean;
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
  selected_context_pack_ids?: string[];
  effective_context_hash?: string | null;
  effective_context_preview?: string | null;
  context_resolved_at?: string | null;
  context_stale?: boolean;
  extracted_release_target_intent?: {
    environment_selector?: { id?: string; slug?: string; name?: string };
    target_instance_selector?: { id?: string; name?: string };
    fqdn?: string;
    tls_mode?: "none" | "nginx+acme" | "host-ingress";
    dns_provider?: "route53";
    runtime?: { type?: string; transport?: string; mode?: string; remote_root?: string };
    notes?: string[];
    confidence?: number;
    extraction_source?: "prompt" | "model" | "labels";
  } | null;
  extracted_release_target_intent_updated_at?: string | null;
  extracted_release_target_intent_source?: string | null;
  extracted_release_target_resolution?: {
    environment_id?: string | null;
    environment_name?: string | null;
    instance_id?: string | null;
    instance_name?: string | null;
    fqdn?: string | null;
    warnings?: string[];
  } | null;
  extracted_release_target_warnings?: string[];
  created_at?: string;
  updated_at?: string;
};

export type DraftSessionRevision = {
  id: string;
  revision_number: number;
  action: "generate" | "revise" | "save" | "snapshot" | "submit";
  instruction?: string;
  created_at: string;
  validation_errors_count: number;
  diff_summary?: string;
};

export type ContextPackDefaultsResponse = {
  draft_kind: "blueprint" | "solution";
  namespace?: string | null;
  project_key?: string | null;
  generate_code: boolean;
  recommended_context_pack_ids: string[];
  required_pack_names: string[];
  recommended_context_packs: ContextPackSummary[];
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
  current_release_id?: string | null;
  current_release_version?: string | null;
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
  release_id?: string | null;
  selected_release_id?: string | null;
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
    termination?: string;
    provider?: string;
    acme_email?: string;
    expose_http?: boolean;
    expose_https?: boolean;
    redirect_http_to_https?: boolean;
  };
  ingress?: {
    network?: string;
    routes?: Array<{
      host: string;
      service: string;
      port: number;
      protocol?: string;
      health_path?: string;
    }>;
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
    termination?: string;
    provider?: string;
    acme_email?: string;
    expose_http?: boolean;
    expose_https?: boolean;
    redirect_http_to_https?: boolean;
  };
  ingress?: {
    network?: string;
    routes?: Array<{
      host: string;
      service: string;
      port: number;
      protocol?: string;
      health_path?: string;
    }>;
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
  provider_id?: string | null;
  provider_display_name?: string | null;
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

export type PlatformBranding = {
  brand_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  background_color: string;
  background_gradient: string;
  text_color: string;
  font_family: string;
  button_radius_px: number;
};

export type PlatformBrandingPayload = Partial<PlatformBranding>;

export type AppBrandingOverride = {
  app_id: string;
  display_name: string;
  logo_url: string;
  primary_color: string;
  background_color: string;
  background_gradient: string;
  text_color: string;
  font_family: string;
  button_radius_px?: number | null;
};

export type AppBrandingOverridePayload = Partial<AppBrandingOverride>;

export type BrandingTokens = {
  appKey: string;
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  colors: {
    primary: string;
    text: string;
    mutedText: string;
    bg: string;
    surface: string;
    border: string;
  };
  radii: {
    button: number;
    card: number;
  };
  fonts: {
    ui: string;
  };
  spacing: {
    pageMaxWidth: number;
    gutter: number;
  };
  shadows: {
    card: string;
  };
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
  build_state?: string;
  blueprint_id?: string | null;
  release_plan_id?: string | null;
  created_from_run_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ReleaseDetail = ReleaseSummary & {
  artifacts_json?: Record<string, unknown> | Array<{ name: string; url: string }> | null;
};

export type ReleaseCreatePayload = {
  version: string;
  status?: string;
  build_state?: string;
  blueprint_id?: string | null;
  release_plan_id?: string | null;
  created_from_run_id?: string | null;
  artifacts_json?: Record<string, unknown> | Array<{ name: string; url: string }>;
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

export type SecretRef = {
  type: string;
  ref: string;
  version?: string | null;
};

export type SecretStore = {
  id: string;
  name: string;
  kind: "aws_secrets_manager";
  is_default: boolean;
  config_json: {
    aws_region?: string;
    name_prefix?: string;
    kms_key_id?: string | null;
    tags?: Record<string, string>;
  };
  created_at?: string;
  updated_at?: string;
};

export type SecretStoreListResponse = {
  secret_stores: SecretStore[];
};

export type SecretRefMetadata = {
  id: string;
  name: string;
  scope_kind: "platform" | "tenant" | "user" | "team";
  scope_id?: string | null;
  store_id: string;
  store_name?: string;
  external_ref: string;
  type: string;
  version?: string | null;
  description?: string;
  metadata_json?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type SecretRefListResponse = {
  secret_refs: SecretRefMetadata[];
};

export type IdentityProvider = {
  id: string;
  display_name: string;
  enabled: boolean;
  issuer: string;
  discovery?: {
    mode?: string;
    jwksUri?: string | null;
    authorizationEndpoint?: string | null;
    tokenEndpoint?: string | null;
    userinfoEndpoint?: string | null;
  };
  client: {
    client_id: string;
    client_secret_ref?: SecretRef | null;
    client_secret_value?: string;
    store_id?: string | null;
  };
  scopes?: string[];
  pkce?: boolean;
  prompt?: string | null;
  domain_rules?: {
    allowedEmailDomains?: string[];
    allowedHostedDomain?: string | null;
  };
  claims?: Record<string, string>;
  audience_rules?: {
    acceptAudiences?: string[];
    acceptAzp?: boolean;
  };
  last_discovery_refresh_at?: string;
};

export type IdentityProviderListResponse = { identity_providers: IdentityProvider[] };

export type IdentityProviderPayload = IdentityProvider;

export type OidcAppClient = {
  id: string;
  app_id: string;
  login_mode: string;
  default_provider_id?: string | null;
  allowed_provider_ids: string[];
  redirect_uris: string[];
  post_logout_redirect_uris?: string[];
  session?: { cookieName?: string; maxAgeSeconds?: number };
  token_validation?: { issuerStrict?: boolean; clockSkewSeconds?: number };
};

export type OidcAppClientListResponse = { oidc_app_clients: OidcAppClient[] };

export type OidcAppClientPayload = OidcAppClient;

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

export type ControlPlaneAppRegistryItem = {
  app_id: string;
  display_name: string;
  category: string;
  default_health_checks: string[];
};

export type ControlPlaneStateItem = {
  environment_id: string;
  environment_name: string;
  app_id: string;
  display_name: string;
  category: string;
  current_release_id?: string | null;
  current_release_version?: string | null;
  last_good_release_id?: string | null;
  last_good_release_version?: string | null;
  last_deploy_run_id?: string | null;
  last_deployed_at?: string | null;
  last_good_at?: string | null;
  last_deployment_id?: string | null;
  last_deployment_status?: string | null;
  last_deployment_error?: string | null;
};

export type ControlPlaneReleaseOption = {
  id: string;
  app_id: string;
  version: string;
  release_plan_id?: string | null;
};

export type ControlPlaneStateResponse = {
  app_registry: ControlPlaneAppRegistryItem[];
  states: ControlPlaneStateItem[];
  releases: ControlPlaneReleaseOption[];
  instances: Array<{ id: string; name: string; environment_id?: string | null; status?: string | null }>;
};

export type XynMapNodeKind = "blueprint" | "release_plan" | "release" | "release_target" | "instance" | "run";

export type XynMapNode = {
  id: string;
  kind: XynMapNodeKind;
  ref: { id: string; kind: string };
  label: string;
  status: "ok" | "warn" | "error" | "unknown";
  badges: string[];
  metrics: Record<string, unknown>;
  links: Record<string, string>;
};

export type XynMapEdge = {
  id: string;
  from: string;
  to: string;
  kind: string;
};

export type XynMapResponse = {
  meta: {
    generated_at: string;
    filters: {
      blueprint_id?: string | null;
      environment_id?: string | null;
      tenant_id?: string | null;
      include_runs: boolean;
      include_instances: boolean;
    };
    options?: {
      blueprints?: Array<{ id: string; label: string }>;
      environments?: Array<{ id: string; name: string }>;
      tenants?: Array<{ id: string; name: string }>;
    };
  };
  nodes: XynMapNode[];
  edges: XynMapEdge[];
  suggested_layout?: string;
};

export type ReportPriority = "p0" | "p1" | "p2" | "p3";
export type ReportType = "bug" | "feature";

export type ReportContext = {
  url?: string;
  route?: string;
  build?: { version?: string; commit?: string };
  user?: { id?: string; email?: string };
  blueprint_ids?: string[];
  release_ids?: string[];
  instance_ids?: string[];
  client?: { user_agent?: string; viewport?: { w?: number; h?: number } };
  occurred_at_iso?: string;
  [key: string]: unknown;
};

export type ReportAttachmentMetadata = {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  storage: {
    provider: "s3" | "local";
    bucket?: string;
    key?: string;
    url_expires_at?: string;
  };
  created_at_iso?: string;
};

export type ReportPayload = {
  type: ReportType;
  title: string;
  description: string;
  priority?: ReportPriority;
  tags?: string[];
  context?: ReportContext;
};

export type ReportRecord = {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  priority: ReportPriority;
  tags: string[];
  context?: ReportContext;
  attachments: ReportAttachmentMetadata[];
  created_at_iso?: string;
  created_by?: { id?: string; email?: string };
};

export type PlatformConfig = {
  storage: {
    primary: { type: "s3" | "local"; name: string };
    providers: Array<{
      name: string;
      type: "s3" | "local";
      s3?: {
        bucket?: string;
        region?: string;
        prefix?: string;
        acl?: string;
        kms_key_id?: string | null;
        use_presigned_put?: boolean;
        public_base_url?: string;
      };
      local?: { base_path?: string };
    }>;
  };
  notifications: {
    enabled: boolean;
    channels: Array<{
      name: string;
      type: "discord" | "aws_sns";
      enabled?: boolean;
      discord?: {
        webhook_url_ref?: string;
        username?: string;
        avatar_url?: string;
      };
      aws_sns?: {
        topic_arn?: string;
        region?: string;
        subject_prefix?: string;
        message_attributes?: Record<string, string>;
      };
    }>;
  };
};

export type PlatformConfigResponse = {
  version: number;
  config: PlatformConfig;
};
