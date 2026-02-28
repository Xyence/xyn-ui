import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import {
  createVideoAdapterConfig,
  getPlatformConfig,
  listVideoAdapterConfigs,
  listVideoAdapters,
  testVideoAdapterConnection,
  updatePlatformConfig,
} from "../../api/xyn";
import type { PlatformConfig, VideoAdapterConfigRecord, VideoAdapterDefinition } from "../../api/types";

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
    rendering_mode:
      (incomingVideo.rendering_mode || fallbackMode) as NonNullable<PlatformConfig["video"]>["rendering_mode"],
    endpoint_url:
      incomingVideo.endpoint_url ??
      merged.video_generation?.http?.endpoint_url ??
      "",
    timeout_seconds:
      incomingVideo.timeout_seconds ??
      merged.video_generation?.http?.timeout_seconds ??
      90,
    retry_count: incomingVideo.retry_count ?? 0,
  };
  return merged;
}

export default function PlatformSettingsPage() {
  const navigate = useNavigate();
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
    load();
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
    loadVideoAdapters();
  }, []);

  const activeVideoConfig = config.video || defaultConfig.video!;
  useEffect(() => {
    if (!activeVideoConfig.adapter_id) {
      setAdapterConfigs([]);
      return;
    }
    loadAdapterConfigs(String(activeVideoConfig.adapter_id));
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

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Platform Settings</h2>
          <p className="muted">Version {version}</p>
        </div>
        <div className="inline-actions">
          <button className="ghost" onClick={load} disabled={loading}>
            Refresh
          </button>
          <button className="primary" onClick={save} disabled={loading}>
            Save
          </button>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <div className="layout">
        <section className="card">
          <div className="card-header">
            <h3>Storage</h3>
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
            <h3>Video Rendering</h3>
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
                  <button type="button" className="ghost" onClick={createAdapterConfigDraft} disabled={!activeVideoConfig.adapter_id || loading}>
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
            <p className="muted small">
              Xyn produces a render package then invokes the selected adapter + canonical adapter config.
            </p>
          ) : null}
          {renderingMode === "render_via_endpoint" ? (
            <p className="muted small">
              Endpoint contract: <code>POST {'{endpoint_url}'}/render</code> with <code>{"{ render_package_id, render_package_hash, callback_url, options }"}</code>.
            </p>
          ) : null}
          {renderingMode === "render_via_model_config" ? (
            <InlineMessage tone="info" title="Feature gated mode" body="Direct model rendering mode is enabled by feature flag. Provider-specific execution is intentionally not implemented in this release." />
          ) : null}
          {loadingAdapters ? <p className="muted small">Loading adapter registry…</p> : null}
        </section>
      </div>
    </>
  );
}
