import { useEffect, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import { getPlatformConfig, updatePlatformConfig } from "../../api/xyn";
import type { PlatformConfig } from "../../api/types";

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
  return merged;
}

export default function PlatformSettingsPage() {
  const [config, setConfig] = useState<PlatformConfig>(defaultConfig);
  const [version, setVersion] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      </div>
    </>
  );
}
