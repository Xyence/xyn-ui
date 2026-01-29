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
  blueprint_kind?: string;
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
  created_at?: string;
  updated_at?: string;
};

export type ReleasePlanDetail = ReleasePlanSummary & {
  milestones_json?: Record<string, unknown> | null;
};

export type ReleasePlanCreatePayload = {
  name?: string;
  target_kind?: string;
  target_fqn?: string;
  from_version?: string;
  to_version?: string;
  milestones_json?: Record<string, unknown>;
};

export type ReleasePlanListResponse = PaginatedResponse<ReleasePlanSummary, "release_plans">;

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

export type RunDetail = RunSummary & {
  error?: string;
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
