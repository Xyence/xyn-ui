import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import {
  addWorkspaceMember,
  createVideoAdapterConfig,
  deleteWorkspaceMember,
  getPlatformConfig,
  listWorkspaceMembers,
  listWorkspaces,
  listVideoAdapterConfigs,
  listVideoAdapters,
  testVideoAdapterConnection,
  updatePlatformConfig,
} from "../../api/xyn";
import type {
  PlatformConfig,
  VideoAdapterConfigRecord,
  VideoAdapterDefinition,
  WorkspaceMembershipSummary,
  WorkspaceSummary,
} from "../../api/types";
import { toWorkspacePath } from "../routing/workspaceRouting";

type SettingsTab = "general" | "security" | "integrations" | "deploy" | "workspaces";

type SettingsCard = {
  title: string;
  description: string;
  actionLabel: string;
  path: string;
  status?: "Configured" | "Needs setup" | "Disabled" | "Available" | "Legacy";
};

const SETTINGS_TABS: Array<{ value: SettingsTab; label: string }> = [
  { value: "general", label: "General" },
  { value: "security", label: "Security" },
  { value: "integrations", label: "Integrations" },
  { value: "deploy", label: "Deploy" },
  { value: "workspaces", label: "Workspaces" },
];

const defaultConfig: PlatformConfig = {
  storage: {
    primary: { type: "local", name: "local" },
    providers: [
      { name: "local", type: "local", local: { base_path: "/tmp/xyn-uploads" } },
      { name: "default", type: "s3", s3: { bucket: "", region: "", prefix: "xyn/", acl: "private" } },
    ],
  },
  notifications: {
    enabled: true,
    channels: [
      { name: "discord-default", type: "discord", enabled: false, discord: { webhook_url_ref: "" } },
      { name: "sns-default", type: "aws_sns", enabled: false, aws_sns: { topic_arn: "", region: "" } },
    ],
  },
  video_generation: {
    enabled: true,
    provider: "export_package",
    http: {
      endpoint_url: "",
      timeout_seconds: 90,
    },
  },
  video: {
    rendering_mode: "export_package_only",
    endpoint_url: "",
    adapter_id: "http_generic_renderer",
    adapter_config_id: null,
    credential_ref: "",
    timeout_seconds: 90,
    retry_count: 0,
  },
};

function ensureConfig(config?: PlatformConfig): PlatformConfig {
  const merged = config ? { ...defaultConfig, ...config } : { ...defaultConfig };
  const providers = merged.storage?.providers || [];
  const hasLocal = providers.some((p) => p.name === "local");
  const hasS3 = providers.some((p) => p.name === "default");
  if (!hasLocal) providers.push({ name: "local", type: "local", local: { base_path: "/tmp/xyn-uploads" } });
  if (!hasS3) providers.push({ name: "default", type: "s3", s3: { bucket: "", region: "", prefix: "xyn/", acl: "private" } });
  merged.storage.providers = providers;
  if (!merged.notifications.channels?.length) merged.notifications.channels = defaultConfig.notifications.channels;
  merged.video_generation = {
    ...defaultConfig.video_generation,
    ...(merged.video_generation || {}),
    http: {
      ...(defaultConfig.video_generation?.http || {}),
      ...((merged.video_generation && merged.video_generation.http) || {}),
    },
  };
  const incomingVideo = merged.video || {};
  const fallbackMode = (() => {
    const provider = String(merged.video_generation?.provider || "").trim().toLowerCase();
    if (provider === "http_adapter" || provider === "http") return "render_via_adapter";
    if (provider === "http_endpoint" || provider === "http_url") return "render_via_endpoint";
    return "export_package_only";
  })();
  merged.video = {
    ...defaultConfig.video,
    ...incomingVideo,
    rendering_mode: (incomingVideo.rendering_mode || fallbackMode) as NonNullable<PlatformConfig["video"]>["rendering_mode"],
    endpoint_url: incomingVideo.endpoint_url ?? merged.video_generation?.http?.endpoint_url ?? "",
    timeout_seconds: incomingVideo.timeout_seconds ?? merged.video_generation?.http?.timeout_seconds ?? 90,
    retry_count: incomingVideo.retry_count ?? 0,
  };
  return merged;
}

function statusChipClass(status: SettingsCard["status"]): string {
  if (status === "Configured" || status === "Available") return "status-chip active";
  if (status === "Legacy") return "status-chip deprecated";
  return "status-chip";
}

function HubCards({ cards, onOpen }: { cards: SettingsCard[]; onOpen: (path: string) => void }) {
  if (!cards.length) {
    return (
      <section className="card">
        <h3>No settings in this section yet</h3>
        <p className="muted">Add providers or platform features to populate this tab.</p>
      </section>
    );
  }
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
      {cards.map((card) => (
        <section key={card.title} className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3>{card.title}</h3>
            {card.status ? <span className={statusChipClass(card.status)}>{card.status}</span> : null}
          </div>
          <p className="muted">{card.description}</p>
          <div className="form-actions">
            <button type="button" className="ghost" onClick={() => onOpen(card.path)}>
              {card.actionLabel}
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function PlatformSettingsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const workspaceId = String(params.workspaceId || "").trim();
  const [searchParams, setSearchParams] = useSearchParams();
  const [config, setConfig] = useState<PlatformConfig>(defaultConfig);
  const [version, setVersion] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingAdapters, setLoadingAdapters] = useState(false);
  const [loadingAdapterConfigs, setLoadingAdapterConfigs] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoAdapters, setVideoAdapters] = useState<VideoAdapterDefinition[]>([]);
  const [adapterConfigs, setAdapterConfigs] = useState<VideoAdapterConfigRecord[]>([]);
  const [renderViaModelEnabled, setRenderViaModelEnabled] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMembershipSummary[]>([]);
  const [workspaceSummary, setWorkspaceSummary] = useState<WorkspaceSummary | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "member">("member");
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [demoCredentialNotice, setDemoCredentialNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getPlatformConfig();
      setVersion(result.version);
      setConfig(ensureConfig(result.config));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const loadVideoAdapters = async () => {
    try {
      setLoadingAdapters(true);
      const result = await listVideoAdapters();
      setVideoAdapters(result.adapters || []);
      setRenderViaModelEnabled(Boolean(result.feature_flags?.render_via_model_config));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingAdapters(false);
    }
  };

  const loadAdapterConfigs = async (adapterId: string) => {
    try {
      setLoadingAdapterConfigs(true);
      const result = await listVideoAdapterConfigs(adapterId, "canonical");
      setAdapterConfigs(result.configs || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingAdapterConfigs(false);
    }
  };

  useEffect(() => {
    void loadVideoAdapters();
  }, []);

  const loadWorkspaceSecurity = async () => {
    if (!workspaceId) {
      setWorkspaceMembers([]);
      setWorkspaceSummary(null);
      return;
    }
    try {
      setMembersLoading(true);
      const [membersResult, workspaceResult] = await Promise.all([
        listWorkspaceMembers(workspaceId),
        listWorkspaces(),
      ]);
      setWorkspaceMembers(membersResult.memberships || []);
      const row = (workspaceResult.workspaces || []).find((item) => item.id === workspaceId) || null;
      setWorkspaceSummary(row);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMembersLoading(false);
    }
  };

  const activeVideoConfig = config.video || defaultConfig.video!;
  useEffect(() => {
    if (!activeVideoConfig.adapter_id) {
      setAdapterConfigs([]);
      return;
    }
    void loadAdapterConfigs(String(activeVideoConfig.adapter_id));
  }, [activeVideoConfig.adapter_id]);

  const setProvider = (name: string, next: Record<string, unknown>) => {
    const providers = (config.storage.providers || []).map((provider) =>
      provider.name === name ? { ...provider, ...next } : provider
    );
    setConfig({ ...config, storage: { ...config.storage, providers } });
  };

  const getProvider = (name: string) => (config.storage.providers || []).find((provider) => provider.name === name);
  const localProvider = getProvider("local") || { name: "local", type: "local", local: { base_path: "/tmp/xyn-uploads" } };
  const s3Provider = getProvider("default") || {
    name: "default",
    type: "s3",
    s3: { bucket: "", region: "", prefix: "xyn/", acl: "private" },
  };
  const discordChannel =
    config.notifications.channels.find((channel) => channel.type === "discord") ||
    ({ name: "discord-default", type: "discord", enabled: false, discord: { webhook_url_ref: "" } } as const);
  const snsChannel =
    config.notifications.channels.find((channel) => channel.type === "aws_sns") ||
    ({ name: "sns-default", type: "aws_sns", enabled: false, aws_sns: { topic_arn: "", region: "" } } as const);

  const updateChannel = (type: "discord" | "aws_sns", next: Record<string, unknown>) => {
    const channels = [...config.notifications.channels];
    const idx = channels.findIndex((channel) => channel.type === type);
    if (idx >= 0) channels[idx] = { ...channels[idx], ...next };
    else channels.push(next as PlatformConfig["notifications"]["channels"][number]);
    setConfig({ ...config, notifications: { ...config.notifications, channels } });
  };

  const renderingMode = activeVideoConfig.rendering_mode || "export_package_only";
  const selectedAdapter = useMemo(
    () => videoAdapters.find((item) => item.id === activeVideoConfig.adapter_id) || null,
    [videoAdapters, activeVideoConfig.adapter_id]
  );
  const selectedAdapterConfig = useMemo(
    () => adapterConfigs.find((item) => item.artifact_id === activeVideoConfig.adapter_config_id) || null,
    [adapterConfigs, activeVideoConfig.adapter_config_id]
  );

  const updateVideo = (next: Partial<NonNullable<PlatformConfig["video"]>>) => {
    setConfig({
      ...config,
      video: {
        ...activeVideoConfig,
        ...next,
      },
    });
  };

  const createAdapterConfigDraft = async () => {
    const adapterId = String(activeVideoConfig.adapter_id || "").trim();
    if (!adapterId) return;
    try {
      setLoading(true);
      const title = `${adapterId.replace(/_/g, " ")} config`.replace(/\b\w/g, (ch) => ch.toUpperCase());
      const result = await createVideoAdapterConfig({
        title,
        adapter_id: adapterId,
      });
      setMessage("Adapter config draft created.");
      await loadAdapterConfigs(adapterId);
      if (result.config?.artifact_id) {
        navigate(`/app/platform/video-adapter-configs/${result.config.artifact_id}`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const result = await updatePlatformConfig(config);
      setVersion(result.version);
      setConfig(ensureConfig(result.config));
      setMessage("Platform settings saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = () => {
    if (renderingMode !== "render_via_adapter" || !selectedAdapterConfig) {
      setError("Select an adapter and adapter config before testing.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    testVideoAdapterConnection({
      adapter_id: selectedAdapterConfig.adapter_id,
      adapter_config_id: selectedAdapterConfig.artifact_id,
    })
      .then((result) => {
        const checksSummary = (result.checks || [])
          .map((item) => `${item.status.toUpperCase()}: ${item.name}`)
          .join(" · ");
        setMessage(
          `${result.ok ? "Connection test passed" : "Connection test reported issues"} for ${selectedAdapterConfig.title}. ${checksSummary}`
        );
      })
      .catch((err) => {
        setError((err as Error).message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const requestedTab = (searchParams.get("tab") || "general").toLowerCase();
  const activeTab: SettingsTab =
    SETTINGS_TABS.find((tab) => tab.value === requestedTab)?.value || "general";

  const setActiveTab = (tab: SettingsTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "general") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next);
  };

  useEffect(() => {
    if (activeTab !== "security") return;
    void loadWorkspaceSecurity();
  }, [activeTab, workspaceId]);

  const addMember = async () => {
    if (!workspaceId || !memberEmail.trim()) return;
    try {
      setMemberActionLoading(true);
      setDemoCredentialNotice(null);
      const result = await addWorkspaceMember(workspaceId, {
        email: memberEmail.trim(),
        role: memberRole,
      });
      if (result.temp_password) {
        setDemoCredentialNotice(
          `Demo mode credentials for ${memberEmail.trim()}: temporary password ${result.temp_password}`
        );
      } else if (result.invite_link) {
        setDemoCredentialNotice(`Invite link: ${result.invite_link}`);
      }
      setMemberEmail("");
      await loadWorkspaceSecurity();
      setMessage("Workspace member added.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMemberActionLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!workspaceId || !memberId) return;
    try {
      setMemberActionLoading(true);
      await deleteWorkspaceMember(workspaceId, memberId);
      await loadWorkspaceSecurity();
      setMessage("Workspace member removed.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMemberActionLoading(false);
    }
  };

  const toScopedPath = (subpath: string, query?: Record<string, string>): string => {
    const rest = subpath.replace(/^\/+/, "");
    const base = workspaceId ? toWorkspacePath(workspaceId, rest) : `/app/${rest}`;
    if (!query || Object.keys(query).length === 0) return base;
    const params = new URLSearchParams(query);
    return `${base}?${params.toString()}`;
  };

  const storageStatus: SettingsCard["status"] =
    config.storage.primary.type === "local"
      ? "Configured"
      : s3Provider.s3?.bucket && s3Provider.s3?.region
      ? "Configured"
      : "Needs setup";
  const notificationsStatus: SettingsCard["status"] =
    !config.notifications.enabled
      ? "Disabled"
      : config.notifications.channels.some((channel) => channel.enabled)
      ? "Configured"
      : "Needs setup";
  const renderingStatus: SettingsCard["status"] =
    renderingMode === "export_package_only"
      ? "Disabled"
      : renderingMode === "render_via_adapter" && activeVideoConfig.adapter_config_id
      ? "Configured"
      : renderingMode === "render_via_endpoint" && activeVideoConfig.endpoint_url
      ? "Configured"
      : "Needs setup";

  const securityCards: SettingsCard[] = [
    {
      title: "Access Control",
      description: "Manage user roles, grants, and effective access across platform capabilities.",
      actionLabel: "Open Access Control",
      path: toScopedPath("platform/access-control"),
      status: "Available",
    },
    {
      title: "Identity Configuration",
      description: "Configure identity providers and OIDC app client settings for login and federation.",
      actionLabel: "Open Identity",
      path: toScopedPath("platform/identity-configuration"),
      status: "Needs setup",
    },
    {
      title: "Secrets",
      description: "Store and rotate credentials used by adapters, notifications, and integrations.",
      actionLabel: "Open Secrets",
      path: toScopedPath("platform/secrets"),
      status: "Available",
    },
    {
      title: "Activity",
      description: "Review governance-relevant activity and trace who changed what and when.",
      actionLabel: "Open Activity",
      path: toScopedPath("govern/activity"),
      status: "Available",
    },
  ];

  const integrationsCards: SettingsCard[] = [
    {
      title: "AI Agents",
      description: "Configure AI credentials, models, and agent purposes for assistant-driven workflows.",
      actionLabel: "Open AI Agents",
      path: toScopedPath("platform/ai-agents"),
      status: "Available",
    },
    {
      title: "Video Adapter Configs",
      description: "Manage renderer adapter configs used by runtime video render workflows.",
      actionLabel: selectedAdapterConfig ? "Open Active Config" : "Open Rendering Settings",
      path: selectedAdapterConfig
        ? toScopedPath(`platform/video-adapter-configs/${selectedAdapterConfig.artifact_id}`)
        : toScopedPath("platform/settings", { tab: "general" }),
      status: selectedAdapterConfig ? "Configured" : "Needs setup",
    },
  ];

  const deployCards: SettingsCard[] = [
    {
      title: "Release Plans",
      description: "Plan and trigger release activity from Runs and deployment workflows.",
      actionLabel: "Open Release Runs",
      path: toScopedPath("run/runs", { filter: "release_plan" }),
      status: "Available",
    },
    {
      title: "Releases",
      description: "Monitor active and historical release execution with linked run telemetry.",
      actionLabel: "Open Runs",
      path: toScopedPath("run/runs"),
      status: "Available",
    },
    {
      title: "Seed Packs",
      description: "Apply curated seed packs for baseline platform content and setup.",
      actionLabel: "Open Seed Packs",
      path: toScopedPath("platform/seeds"),
      status: "Available",
    },
    {
      title: "Instances",
      description: "Power-user deep link for instance management while Instances stays hidden from sidebar.",
      actionLabel: "Open Instances",
      path: toScopedPath("run/instances"),
      status: "Legacy",
    },
    {
      title: "Control Plane",
      description: "Legacy control-plane surface retained as a fallback while capabilities move to artifacts.",
      actionLabel: "Open Control Plane",
      path: toScopedPath("control-plane"),
      status: "Legacy",
    },
  ];

  const workspaceCards: SettingsCard[] = [
    {
      title: "Workspace Management",
      description: "Create and maintain workspace records, including lifecycle metadata and hierarchy.",
      actionLabel: "Open Workspaces",
      path: toScopedPath("workspaces", { tab: "management" }),
      status: "Available",
    },
    {
      title: "People & Roles",
      description: "Manage workspace memberships and role assignments for selected workspaces.",
      actionLabel: "Open People & Roles",
      path: toScopedPath("workspaces", { tab: "people_roles" }),
      status: "Available",
    },
    {
      title: "Tenants",
      description: "Manage tenant records and tenant-level metadata associated with workspace operations.",
      actionLabel: "Open Tenants",
      path: toScopedPath("platform/tenants"),
      status: "Available",
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Platform Settings</h2>
          <p className="muted">Version {version}</p>
        </div>
        <div className="inline-actions">
          <button className="ghost" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
          <button className="primary" onClick={() => void save()} disabled={loading}>
            Save
          </button>
        </div>
      </div>

      <div className="inline-actions" style={{ marginBottom: 10 }}>
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={activeTab === tab.value ? "primary" : "ghost"}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      {activeTab === "security" ? (
        <>
          <section className="card" style={{ marginBottom: 12 }}>
            <div className="card-header">
              <h3>Users</h3>
              <span className="status-chip active">Auth mode: {workspaceSummary?.auth_mode || "local"}</span>
            </div>
            <p className="muted">
              Workspace memberships control tenant access. Demo mode can create local users with temporary passwords.
            </p>
            <div className="form-grid" style={{ gridTemplateColumns: "2fr 1fr auto" }}>
              <label>
                Email
                <input
                  className="input"
                  placeholder="user@example.com"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                />
              </label>
              <label>
                Role
                <select value={memberRole} onChange={(event) => setMemberRole(event.target.value as "admin" | "member")}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <div className="form-actions" style={{ alignSelf: "end" }}>
                <button className="primary" onClick={() => void addMember()} disabled={memberActionLoading || !workspaceId}>
                  {memberActionLoading ? "Adding..." : "Add member"}
                </button>
              </div>
            </div>
            {demoCredentialNotice ? <InlineMessage tone="info" title="Demo credentials" body={demoCredentialNotice} /> : null}
            <div style={{ marginTop: 10 }}>
              {membersLoading ? <p className="muted">Loading members...</p> : null}
              {!membersLoading && workspaceMembers.length === 0 ? <p className="muted">No members yet.</p> : null}
              {!membersLoading && workspaceMembers.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {workspaceMembers.map((member) => (
                    <div
                      key={member.id}
                      className="instance-row"
                      style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto auto", alignItems: "center", gap: 10 }}
                    >
                      <div>
                        <strong>{member.email || member.display_name || member.user_identity_id}</strong>
                        <div className="muted small">{member.display_name || member.user_identity_id}</div>
                      </div>
                      <span className="status-chip">{member.role}</span>
                      <button
                        className="ghost"
                        onClick={() => void removeMember(member.id)}
                        disabled={memberActionLoading}
                        aria-label={`Remove ${member.email || member.user_identity_id}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
          <HubCards cards={securityCards} onOpen={(path) => navigate(path)} />
        </>
      ) : null}
      {activeTab === "integrations" ? <HubCards cards={integrationsCards} onOpen={(path) => navigate(path)} /> : null}
      {activeTab === "deploy" ? <HubCards cards={deployCards} onOpen={(path) => navigate(path)} /> : null}
      {activeTab === "workspaces" ? <HubCards cards={workspaceCards} onOpen={(path) => navigate(path)} /> : null}

      {activeTab === "general" ? (
        <div className="layout">
          <section className="card">
            <div className="card-header">
              <h3>Branding</h3>
              <span className="status-chip active">Configured</span>
            </div>
            <p className="muted">Tenant branding and theme settings are managed in the dedicated Branding surface.</p>
            <div className="form-actions">
              <button className="ghost" onClick={() => navigate(toScopedPath("platform/branding"))}>
                Open Branding
              </button>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h3>Storage</h3>
              <span className={statusChipClass(storageStatus)}>{storageStatus}</span>
            </div>
            <div className="form-grid">
              <label>
                Primary provider
                <select
                  value={config.storage.primary.type}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      storage: {
                        ...config.storage,
                        primary:
                          event.target.value === "s3"
                            ? { type: "s3", name: "default" }
                            : { type: "local", name: "local" },
                      },
                    })
                  }
                >
                  <option value="local">local</option>
                  <option value="s3">s3</option>
                </select>
              </label>
              <label>
                Local base path
                <input
                  className="input"
                  value={localProvider.local?.base_path || ""}
                  onChange={(event) =>
                    setProvider("local", {
                      local: { ...(localProvider.local || {}), base_path: event.target.value },
                    })
                  }
                />
              </label>
              <label>
                S3 bucket
                <input
                  className="input"
                  value={s3Provider.s3?.bucket || ""}
                  onChange={(event) =>
                    setProvider("default", {
                      s3: { ...(s3Provider.s3 || {}), bucket: event.target.value, acl: "private" },
                    })
                  }
                />
              </label>
              <label>
                S3 region
                <input
                  className="input"
                  value={s3Provider.s3?.region || ""}
                  onChange={(event) =>
                    setProvider("default", {
                      s3: { ...(s3Provider.s3 || {}), region: event.target.value, acl: "private" },
                    })
                  }
                />
              </label>
              <label>
                S3 prefix
                <input
                  className="input"
                  value={s3Provider.s3?.prefix || ""}
                  onChange={(event) =>
                    setProvider("default", {
                      s3: { ...(s3Provider.s3 || {}), prefix: event.target.value, acl: "private" },
                    })
                  }
                />
              </label>
              <label>
                S3 KMS key ID (optional)
                <input
                  className="input"
                  value={s3Provider.s3?.kms_key_id || ""}
                  onChange={(event) =>
                    setProvider("default", {
                      s3: { ...(s3Provider.s3 || {}), kms_key_id: event.target.value, acl: "private" },
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h3>Notifications</h3>
              <span className={statusChipClass(notificationsStatus)}>{notificationsStatus}</span>
            </div>
            <div className="form-grid">
              <label>
                Notifications enabled
                <select
                  value={config.notifications.enabled ? "yes" : "no"}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      notifications: { ...config.notifications, enabled: event.target.value === "yes" },
                    })
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label>
                Discord enabled
                <select
                  value={discordChannel.enabled ? "yes" : "no"}
                  onChange={(event) =>
                    updateChannel("discord", {
                      ...discordChannel,
                      enabled: event.target.value === "yes",
                    })
                  }
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
              <label>
                Discord webhook SecretRef
                <input
                  className="input"
                  placeholder="secret_ref:<uuid> or platform SecretRef name"
                  value={discordChannel.discord?.webhook_url_ref || ""}
                  onChange={(event) =>
                    updateChannel("discord", {
                      ...discordChannel,
                      discord: { ...(discordChannel.discord || {}), webhook_url_ref: event.target.value },
                    })
                  }
                />
              </label>
              <label>
                SNS enabled
                <select
                  value={snsChannel.enabled ? "yes" : "no"}
                  onChange={(event) =>
                    updateChannel("aws_sns", {
                      ...snsChannel,
                      enabled: event.target.value === "yes",
                    })
                  }
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
              <label>
                SNS topic ARN
                <input
                  className="input"
                  value={snsChannel.aws_sns?.topic_arn || ""}
                  onChange={(event) =>
                    updateChannel("aws_sns", {
                      ...snsChannel,
                      aws_sns: { ...(snsChannel.aws_sns || {}), topic_arn: event.target.value },
                    })
                  }
                />
              </label>
              <label>
                SNS region
                <input
                  className="input"
                  value={snsChannel.aws_sns?.region || ""}
                  onChange={(event) =>
                    updateChannel("aws_sns", {
                      ...snsChannel,
                      aws_sns: { ...(snsChannel.aws_sns || {}), region: event.target.value },
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h3>Rendering</h3>
              <span className={statusChipClass(renderingStatus)}>{renderingStatus}</span>
            </div>
            <div className="form-grid">
              <label>
                Rendering mode
                <select
                  value={renderingMode}
                  onChange={(event) =>
                    updateVideo({
                      rendering_mode: event.target.value as NonNullable<PlatformConfig["video"]>["rendering_mode"],
                    })
                  }
                >
                  <option value="export_package_only">Export package only</option>
                  <option value="render_via_adapter">Render via adapter</option>
                  <option value="render_via_endpoint">Render via endpoint</option>
                  {renderViaModelEnabled ? <option value="render_via_model_config">Render via model config</option> : null}
                </select>
              </label>
              {renderingMode === "render_via_adapter" ? (
                <>
                  <label>
                    Renderer adapter
                    <select
                      value={activeVideoConfig.adapter_id || ""}
                      onChange={(event) =>
                        updateVideo({
                          adapter_id: event.target.value,
                          adapter_config_id: null,
                        })
                      }
                    >
                      <option value="">Select adapter</option>
                      {videoAdapters.map((adapter) => (
                        <option key={adapter.id} value={adapter.id}>
                          {adapter.name}
                        </option>
                      ))}
                    </select>
                    <span className="muted small">{selectedAdapter?.description || "Choose how Xyn hands render packages to a renderer."}</span>
                  </label>
                  <label>
                    Adapter config (canonical)
                    <select
                      value={activeVideoConfig.adapter_config_id || ""}
                      onChange={(event) => updateVideo({ adapter_config_id: event.target.value || null })}
                      disabled={!activeVideoConfig.adapter_id || loadingAdapterConfigs}
                    >
                      <option value="">{loadingAdapterConfigs ? "Loading…" : "Select config"}</option>
                      {adapterConfigs.map((item) => (
                        <option key={item.artifact_id} value={item.artifact_id}>
                          {item.title} ({item.slug || item.artifact_id.slice(0, 8)} · v{item.version})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="ghost"
                      disabled={!selectedAdapterConfig}
                      onClick={() =>
                        selectedAdapterConfig &&
                        navigate(`/app/platform/video-adapter-configs/${selectedAdapterConfig.artifact_id}`)
                      }
                    >
                      Open config
                    </button>
                    <button type="button" className="ghost" onClick={() => void createAdapterConfigDraft()} disabled={!activeVideoConfig.adapter_id || loading}>
                      Create config
                    </button>
                    <button type="button" className="ghost" onClick={testConnection} disabled={!selectedAdapterConfig}>
                      Test connection
                    </button>
                  </div>
                </>
              ) : null}
              {renderingMode === "render_via_endpoint" ? (
                <>
                  <label>
                    Endpoint URL
                    <input
                      className="input"
                      placeholder="https://renderer.example.com/render"
                      value={activeVideoConfig.endpoint_url || ""}
                      onChange={(event) => updateVideo({ endpoint_url: event.target.value })}
                    />
                  </label>
                  <label>
                    Authorization credential ref (optional)
                    <input
                      className="input"
                      placeholder="secret_ref:<uuid> or credential name"
                      value={activeVideoConfig.credential_ref || ""}
                      onChange={(event) => updateVideo({ credential_ref: event.target.value })}
                    />
                  </label>
                  <label>
                    Timeout (seconds)
                    <input
                      className="input"
                      type="number"
                      min={5}
                      max={600}
                      value={activeVideoConfig.timeout_seconds ?? 90}
                      onChange={(event) => updateVideo({ timeout_seconds: Number(event.target.value) || 90 })}
                    />
                  </label>
                  <label>
                    Retry count
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={10}
                      value={activeVideoConfig.retry_count ?? 0}
                      onChange={(event) => updateVideo({ retry_count: Number(event.target.value) || 0 })}
                    />
                  </label>
                </>
              ) : null}
            </div>
            {renderingMode === "export_package_only" ? (
              <p className="muted small">No rendering is performed. Xyn produces a governed render package for export/use elsewhere.</p>
            ) : null}
            {renderingMode === "render_via_adapter" ? (
              <p className="muted small">Xyn produces a render package then invokes the selected adapter + canonical adapter config.</p>
            ) : null}
            {renderingMode === "render_via_endpoint" ? (
              <p className="muted small">
                Endpoint contract: <code>POST {'{endpoint_url}'}/render</code> with <code>{"{ render_package_id, render_package_hash, callback_url, options }"}</code>.
              </p>
            ) : null}
            {renderingMode === "render_via_model_config" ? (
              <InlineMessage
                tone="info"
                title="Feature gated mode"
                body="Direct model rendering mode is enabled by feature flag. Provider-specific execution is intentionally not implemented in this release."
              />
            ) : null}
            {loadingAdapters ? <p className="muted small">Loading adapter registry…</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
