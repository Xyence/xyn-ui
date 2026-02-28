import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import { getVideoAdapterConfig, listVideoAdapters, updateVideoAdapterConfig } from "../../api/xyn";
import type { VideoAdapterConfigRecord, VideoAdapterDefinition } from "../../api/types";

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function VideoAdapterConfigPage() {
  const navigate = useNavigate();
  const { artifactId = "" } = useParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<VideoAdapterConfigRecord | null>(null);
  const [adapters, setAdapters] = useState<VideoAdapterDefinition[]>([]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [artifactState, setArtifactState] = useState("provisional");
  const [adapterId, setAdapterId] = useState("");
  const [configJsonText, setConfigJsonText] = useState("{}");

  const activeAdapter = useMemo(
    () => adapters.find((item) => item.id === adapterId) || null,
    [adapters, adapterId]
  );

  const load = async () => {
    if (!artifactId) return;
    try {
      setLoading(true);
      setError(null);
      const [detail, adapterList] = await Promise.all([getVideoAdapterConfig(artifactId), listVideoAdapters()]);
      const next = detail.config;
      setRecord(next);
      setAdapters(adapterList.adapters || []);
      setTitle(next.title || "");
      setSlug(next.slug || "");
      setArtifactState(next.artifact_state || "provisional");
      setAdapterId(next.adapter_id || "");
      setConfigJsonText(prettyJson(next.config_json || {}));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [artifactId]);

  const save = async () => {
    if (!artifactId) return;
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(configJsonText || "{}");
      } catch {
        setError("Config JSON is invalid.");
        setLoading(false);
        return;
      }
      parsed.adapter_id = adapterId;
      const result = await updateVideoAdapterConfig(artifactId, {
        title,
        slug,
        artifact_state: artifactState,
        adapter_id: adapterId,
        config_json: parsed,
      });
      setRecord(result.config);
      setConfigJsonText(prettyJson(result.config.config_json || {}));
      setMessage("Adapter config saved.");
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
          <h2>Video Adapter Config</h2>
          <p className="muted">Governed renderer adapter configuration.</p>
        </div>
        <div className="inline-actions">
          <button className="ghost" onClick={() => navigate("/app/platform/settings")}>
            Back to settings
          </button>
          <button className="ghost" onClick={load} disabled={loading}>
            Refresh
          </button>
          <button className="primary" onClick={save} disabled={loading || !artifactId}>
            Save
          </button>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <section className="card">
        <div className="form-grid">
          <label>
            Title
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Slug
            <input className="input" value={slug} onChange={(event) => setSlug(event.target.value)} />
          </label>
          <label>
            State
            <select value={artifactState} onChange={(event) => setArtifactState(event.target.value)}>
              <option value="provisional">provisional</option>
              <option value="canonical">canonical</option>
              <option value="deprecated">deprecated</option>
            </select>
          </label>
          <label>
            Adapter
            <select value={adapterId} onChange={(event) => setAdapterId(event.target.value)}>
              <option value="">Select adapter</option>
              {adapters.map((adapter) => (
                <option key={adapter.id} value={adapter.id}>
                  {adapter.name}
                </option>
              ))}
            </select>
            <span className="muted small">{activeAdapter?.description || ""}</span>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Config JSON
            <textarea
              className="input"
              style={{ minHeight: 360, fontFamily: "monospace" }}
              value={configJsonText}
              onChange={(event) => setConfigJsonText(event.target.value)}
            />
          </label>
        </div>
      </section>

      {record ? (
        <p className="muted small">
          Artifact: {record.artifact_id} · Version: {record.version} · Hash: {record.content_hash || "-"}
        </p>
      ) : null}
    </>
  );
}
