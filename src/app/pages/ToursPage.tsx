import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { listWorkflows } from "../../api/xyn";
import type { WorkflowSummary } from "../../api/types";

export default function ToursPage() {
  const [items, setItems] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("xyn_usage");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listWorkflows({ profile: "tour", status: "published", category });
        setItems(data.workflows || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [category]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Tours</h2>
          <p className="muted">Published guided workflows (profile: tour).</p>
        </div>
        <div className="inline-actions">
          <label>
            Category
            <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="xyn_usage">Xyn Usage</option>
              <option value="">All categories</option>
            </select>
          </label>
        </div>
      </div>
      <section className="card">
        <div className="card-header">
          <h3>Available tours</h3>
        </div>
        {loading && <p className="muted">Loading…</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !items.length && <p className="muted">No tours found for this category.</p>}
        {items.map((item) => (
          <button
            key={item.id}
            className="instance-row guides-tour-row"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("xyn:start-tour", { detail: { slug: item.slug, workflowId: item.id } }));
            }}
          >
            <div>
              <strong>{item.title}</strong>
              <span className="muted small">{item.description || "Guided workflow"}</span>
            </div>
            <span className="guides-tour-arrow" aria-hidden="true">
              <ChevronRight size={16} />
            </span>
          </button>
        ))}
      </section>
    </>
  );
}
