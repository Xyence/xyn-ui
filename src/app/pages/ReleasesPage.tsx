import { useCallback, useEffect, useMemo, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import {
  getRelease,
  listBlueprints,
  listEnvironments,
  listReleasePlans,
  listReleases,
  updateRelease,
} from "../../api/xyn";
import type {
  BlueprintSummary,
  EnvironmentSummary,
  ReleaseDetail,
  ReleasePlanSummary,
  ReleaseSummary,
} from "../../api/types";

export default function ReleasesPage() {
  const [items, setItems] = useState<ReleaseSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReleaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [environmentId, setEnvironmentId] = useState<string>("");
  const [blueprints, setBlueprints] = useState<BlueprintSummary[]>([]);
  const [releasePlans, setReleasePlans] = useState<ReleasePlanSummary[]>([]);

  const environmentNameById = useMemo(() => {
    return environments.reduce<Record<string, string>>((acc, env) => {
      acc[env.id] = env.name;
      return acc;
    }, {});
  }, [environments]);

  const blueprintNameById = useMemo(() => {
    return blueprints.reduce<Record<string, string>>((acc, blueprint) => {
      acc[blueprint.id] = blueprint.name;
      return acc;
    }, {});
  }, [blueprints]);

  const releasePlanNameById = useMemo(() => {
    return releasePlans.reduce<Record<string, string>>((acc, plan) => {
      acc[plan.id] = plan.name;
      return acc;
    }, {});
  }, [releasePlans]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listReleases(undefined, environmentId || undefined);
      setItems(data.releases);
      if (!selectedId && data.releases[0]) {
        setSelectedId(data.releases[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [environmentId, selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [envs, blueprintData, releasePlanData] = await Promise.all([
          listEnvironments(),
          listBlueprints(),
          listReleasePlans(),
        ]);
        setEnvironments(envs.environments);
        setBlueprints(blueprintData.blueprints);
        setReleasePlans(releasePlanData.release_plans);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    (async () => {
      try {
        const detail = await getRelease(selectedId);
        setSelected(detail);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedId]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await load();
      setMessage("Releases refreshed.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selected) return;
    try {
      setLoading(true);
      setError(null);
      await updateRelease(selected.id, { status: "published" });
      const detail = await getRelease(selected.id);
      setSelected(detail);
      await load();
      setMessage(`Release ${detail.version} published.`);
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
          <h2>Releases</h2>
          <p className="muted">Generated releases and artifacts.</p>
        </div>
        <div className="inline-actions">
          <select
            className="input"
            value={environmentId}
            onChange={(event) => setEnvironmentId(event.target.value)}
          >
            <option value="">All environments</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
          <button className="ghost" onClick={handleRefresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <div className="layout">
        <section className="card">
          <div className="card-header">
            <h3>Releases</h3>
          </div>
          <div className="instance-list">
            {items.map((item) => (
              <button
                key={item.id}
                className={`instance-row ${selectedId === item.id ? "active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div>
                  <strong>{item.version}</strong>
                  <span className="muted small">{item.status} · </span>
                  <span className="muted small">
                    {blueprintNameById[item.blueprint_id ?? ""] ?? item.blueprint_id ?? "—"}
                  </span>
                </div>
                <div className="muted small">
                  <div>{environmentNameById[item.environment_id ?? ""] ?? "All environments"}</div>
                  <div>{item.release_plan_id ? "Has release plan" : "No release plan"}</div>
                </div>
              </button>
            ))}
            {items.length === 0 && <p className="muted">No releases yet.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Release detail</h3>
          </div>
          {!selected ? (
            <p className="muted">Select a release to inspect.</p>
          ) : (
            <>
              {selected.status === "draft" && (
                <InlineMessage
                  tone="info"
                  title="Draft release"
                  body="This release is in draft state. Drafts are not promoted to targets until published or deployed."
                />
              )}
              <div className="detail-grid">
                <div>
                  <div className="label">Version</div>
                  <strong>{selected.version}</strong>
                </div>
                <div>
                  <div className="label">Status</div>
                  <span className="muted">{selected.status}</span>
                </div>
                <div>
                  <div className="label">Blueprint</div>
                  <span className="muted">
                    {blueprintNameById[selected.blueprint_id ?? ""] ??
                      selected.blueprint_id ??
                      "—"}
                  </span>
                </div>
                <div>
                  <div className="label">Release plan</div>
                  <span className="muted">
                    {releasePlanNameById[selected.release_plan_id ?? ""] ??
                      selected.release_plan_id ??
                      "—"}
                  </span>
                </div>
                <div>
                  <div className="label">Environment</div>
                  <span className="muted">
                    {environmentNameById[selected.environment_id ?? ""] ?? "—"}
                  </span>
                </div>
                <div>
                  <div className="label">Created from run</div>
                  <span className="muted">{selected.created_from_run_id ?? "—"}</span>
                </div>
                <div>
                  <div className="label">Created</div>
                  <span className="muted">{selected.created_at ?? "—"}</span>
                </div>
                <div>
                  <div className="label">Updated</div>
                  <span className="muted">{selected.updated_at ?? "—"}</span>
                </div>
              </div>
              <div className="stack">
                {selected.status === "draft" && (
                  <div className="inline-actions">
                    <button className="primary" onClick={handlePublish} disabled={loading}>
                      Publish release
                    </button>
                  </div>
                )}
                <strong>Artifacts</strong>
                {(selected.artifacts_json || []).length === 0 ? (
                  <span className="muted">No artifacts attached.</span>
                ) : (
                  (selected.artifacts_json || []).map((artifact) => (
                    <div key={artifact.name} className="item-row">
                      <div>
                        <strong>{artifact.name}</strong>
                      </div>
                      <a className="link small" href={artifact.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
