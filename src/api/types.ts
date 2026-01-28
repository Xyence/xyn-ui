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
