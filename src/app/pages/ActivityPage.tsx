import { useCallback, useEffect, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import { listWorkspaceActivity } from "../../api/xyn";
import type { ArtifactEventSummary } from "../../api/types";

export default function ActivityPage({ workspaceId }: { workspaceId: string }) {
  const [items, setItems] = useState<ArtifactEventSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setItems([]);
      return;
    }
    try {
      setError(null);
      const data = await listWorkspaceActivity(workspaceId);
      setItems(data.events || []);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Activity</h2>
          <p className="muted">Immutable workspace artifact event feed.</p>
        </div>
        <button className="ghost" onClick={load}>Refresh</button>
      </div>
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      <section className="card">
        <div className="instance-list">
          {items.map((item) => (
            <div className="instance-row" key={item.id}>
              <div>
                <strong>{item.event_type}</strong>
                <span className="muted small">{item.artifact_title}</span>
              </div>
              <div className="muted small">{item.created_at || ""}</div>
            </div>
          ))}
          {items.length === 0 && <p className="muted">No activity yet.</p>}
        </div>
      </section>
    </>
  );
}
