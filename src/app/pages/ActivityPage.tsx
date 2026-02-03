import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import StatusPill from "../../components/StatusPill";
import { listRuns } from "../../api/xyn";
import type { RunSummary } from "../../api/types";

const ENTITY_OPTIONS = [
  { label: "All", value: "" },
  { label: "Blueprint", value: "blueprint" },
  { label: "Registry", value: "registry" },
  { label: "Release Plan", value: "release_plan" },
  { label: "Module", value: "module" },
];

export default function ActivityPage() {
  const [items, setItems] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEntity = searchParams.get("entity") || "";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listRuns(selectedEntity || undefined);
      setItems(data.runs);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedEntity]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEntityChange = (value: string) => {
    if (value) {
      setSearchParams({ entity: value });
    } else {
      setSearchParams({});
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Activity</h2>
          <p className="muted">Latest runs across blueprints, registries, and release plans.</p>
        </div>
        <div className="inline-actions">
          <label className="muted small">Filter</label>
          <select
            value={selectedEntity}
            onChange={(event) => handleEntityChange(event.target.value)}
          >
            {ENTITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="ghost" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}

      <section className="card">
        <div className="card-header">
          <h3>Recent runs</h3>
        </div>
        {items.length === 0 ? (
          <p className="muted">No runs available.</p>
        ) : (
          <div className="table">
            <div className="table-row table-head">
              <span>Entity</span>
              <span>Run</span>
              <span>Status</span>
              <span>Started</span>
              <span>Finished</span>
              <span>Action</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className="table-row">
                <span>{item.entity_type}</span>
                <span className="muted small">{item.id.slice(0, 8)}</span>
                <StatusPill status={item.status} />
                <span className="muted small">{item.started_at ?? "—"}</span>
                <span className="muted small">{item.finished_at ?? "—"}</span>
                <Link className="table-link" to={`/app/runs?run=${item.id}`}>
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
