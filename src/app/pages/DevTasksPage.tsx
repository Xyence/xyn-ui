import { useCallback, useEffect, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import StatusPill from "../../components/StatusPill";
import { cancelDevTask, getDevTask, listDevTasks, retryDevTask, runDevTask } from "../../api/xyn";
import type { DevTaskDetail, DevTaskSummary } from "../../api/types";

const STATUS_OPTIONS = ["", "queued", "running", "succeeded", "failed", "canceled"];

export default function DevTasksPage() {
  const [items, setItems] = useState<DevTaskSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DevTaskDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listDevTasks(statusFilter || undefined);
      setItems(data.dev_tasks);
      if (!selectedId && data.dev_tasks[0]) {
        setSelectedId(data.dev_tasks[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedId, statusFilter]);

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
        const detail = await getDevTask(selectedId);
        setSelected(detail);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedId]);

  const handleRun = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await runDevTask(selectedId);
      setMessage(`Run queued: ${result.run_id}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      await cancelDevTask(selectedId);
      setMessage("Task canceled.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await retryDevTask(selectedId);
      setMessage(`Retry queued: ${result.run_id}`);
      await load();
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
          <h2>Dev Tasks</h2>
          <p className="muted">Queued and running development tasks.</p>
        </div>
        <div className="inline-actions">
          <label className="muted small">Status</label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt || "All"}
              </option>
            ))}
          </select>
          <button className="ghost" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <div className="layout">
        <section className="card">
          <div className="card-header">
            <h3>Tasks</h3>
          </div>
          <div className="instance-list">
            {items.map((item) => (
              <button
                key={item.id}
                className={`instance-row ${selectedId === item.id ? "active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div>
                  <strong>{item.title}</strong>
                  <span className="muted small">{item.task_type}</span>
                </div>
                <StatusPill status={item.status} />
              </button>
            ))}
            {items.length === 0 && <p className="muted">No dev tasks found.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Task detail</h3>
          </div>
          {!selected ? (
            <p className="muted">Select a task to inspect.</p>
          ) : (
            <>
              <div className="detail-grid">
                <div>
                  <div className="label">Task type</div>
                  <strong>{selected.task_type}</strong>
                </div>
                <div>
                  <div className="label">Status</div>
                  <StatusPill status={selected.status} />
                </div>
                <div>
                  <div className="label">Target instance</div>
                  <span className="muted">{selected.target_instance_id ?? "—"}</span>
                </div>
                <div>
                  <div className="label">Attempts</div>
                  <span className="muted">
                    {selected.attempts}/{selected.max_attempts}
                  </span>
                </div>
                <div>
                  <div className="label">Context purpose</div>
                  <span className="muted">{selected.context_purpose}</span>
                </div>
                <div>
                  <div className="label">Result run</div>
                  {selected.result_run ? (
                    <a className="link" href={`/app/runs?run=${selected.result_run}`}>
                      {selected.result_run}
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
              </div>
              {selected.last_error && (
                <InlineMessage tone="error" title="Last error" body={selected.last_error} />
              )}
              <div className="form-actions">
                <button className="primary" onClick={handleRun} disabled={loading}>
                  Run task
                </button>
                <button
                  className="ghost"
                  onClick={handleRetry}
                  disabled={loading || !["failed", "canceled"].includes(selected.status)}
                >
                  Retry
                </button>
                <button className="danger" onClick={handleCancel} disabled={loading}>
                  Cancel
                </button>
              </div>
              <div className="stack">
                <strong>Context packs</strong>
                {(selected.context_packs || []).map((pack) => (
                  <div key={pack.id} className="item-row">
                    <div>
                      <strong>{pack.name}</strong>
                      <span className="muted small">
                        {pack.purpose} · {pack.scope} · {pack.version}
                      </span>
                    </div>
                  </div>
                ))}
                {(selected.context_packs || []).length === 0 && (
                  <span className="muted">No context packs attached.</span>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
