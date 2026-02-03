import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import { getRun, getRunArtifacts, getRunLogs, listRuns } from "../../api/xyn";
import type { RunArtifact, RunDetail, RunSummary } from "../../api/types";
import StatusPill from "../../components/StatusPill";

export default function RunsPage() {
  const [items, setItems] = useState<RunSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<RunDetail | null>(null);
  const [logs, setLogs] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<RunArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const runParam = searchParams.get("run");

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listRuns();
      setItems(data.runs);
      if (!selectedId && data.runs[0]) {
        setSelectedId(data.runs[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (runParam) {
      setSelectedId(runParam);
    }
  }, [runParam]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setLogs(null);
      setArtifacts([]);
      return;
    }
    (async () => {
      try {
        const detail = await getRun(selectedId);
        setSelected(detail);
        const log = await getRunLogs(selectedId);
        setLogs(log.log ?? "");
        const artifactList = await getRunArtifacts(selectedId);
        setArtifacts(artifactList);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedId]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setMessage(null);
      await load();
      if (selectedId) {
        const detail = await getRun(selectedId);
        setSelected(detail);
        const log = await getRunLogs(selectedId);
        setLogs(log.log ?? "");
        const artifactList = await getRunArtifacts(selectedId);
        setArtifacts(artifactList);
      }
      setMessage("Runs refreshed.");
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
          <h2>Runs</h2>
          <p className="muted">Inspect submission runs and artifacts.</p>
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
            <h3>Runs</h3>
          </div>
          <div className="instance-list">
            {items.map((item) => (
              <button
                key={item.id}
                className={`instance-row ${selectedId === item.id ? "active" : ""}`}
                onClick={() => {
                  setSelectedId(item.id);
                  setSearchParams({ run: item.id });
                }}
              >
                <div>
                  <strong>{item.entity_type}</strong>
                  <span className="muted small">{item.entity_id}</span>
                </div>
                <StatusPill status={item.status} />
              </button>
            ))}
            {items.length === 0 && <p className="muted">No runs yet.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Run detail</h3>
          </div>
          {!selected ? (
            <p className="muted">Select a run to see detail.</p>
          ) : (
            <>
              <div className="detail-grid">
                <div>
                  <div className="label">Entity</div>
                  <strong>{selected.entity_type}</strong>
                </div>
                <div>
                  <div className="label">Status</div>
                  <StatusPill status={selected.status} />
                </div>
                <div>
                  <div className="label">Started</div>
                  <span className="muted">{selected.started_at ?? "—"}</span>
                </div>
                <div>
                  <div className="label">Finished</div>
                  <span className="muted">{selected.finished_at ?? "—"}</span>
                </div>
              </div>
              {selected.error && <InlineMessage tone="error" title="Run error" body={selected.error} />}
            </>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Logs</h3>
          </div>
          {logs ? (
            <div className="log-box">
              <pre>{logs}</pre>
            </div>
          ) : (
            <p className="muted">No logs captured.</p>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Artifacts</h3>
          </div>
          {artifacts.length === 0 ? (
            <p className="muted">No artifacts recorded.</p>
          ) : (
            <div className="stack">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="item-row">
                  <div>
                    <strong>{artifact.name}</strong>
                    <span className="muted small">{artifact.kind}</span>
                  </div>
                  {artifact.url && (
                    <a className="muted small" href={artifact.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
