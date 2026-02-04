import { useCallback, useEffect, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import { getRelease, listReleases } from "../../api/xyn";
import type { ReleaseDetail, ReleaseSummary } from "../../api/types";

export default function ReleasesPage() {
  const [items, setItems] = useState<ReleaseSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReleaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listReleases();
      setItems(data.releases);
      if (!selectedId && data.releases[0]) {
        setSelectedId(data.releases[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Releases</h2>
          <p className="muted">Generated releases and artifacts.</p>
        </div>
        <button className="ghost" onClick={handleRefresh} disabled={loading}>
          Refresh
        </button>
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
                  <span className="muted small">{item.status}</span>
                </div>
                <span className="muted small">{item.blueprint_id ?? "—"}</span>
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
                  <span className="muted">{selected.blueprint_id ?? "—"}</span>
                </div>
                <div>
                  <div className="label">Release plan</div>
                  <span className="muted">{selected.release_plan_id ?? "—"}</span>
                </div>
              </div>
              <div className="stack">
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
