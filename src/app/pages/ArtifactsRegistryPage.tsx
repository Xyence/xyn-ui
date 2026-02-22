import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import { listArticles, listWorkspaceArtifacts } from "../../api/xyn";
import type { ArtifactSummary } from "../../api/types";

type CategoryById = Record<string, string>;

export default function ArtifactsRegistryPage({ workspaceId }: { workspaceId: string }) {
  const [items, setItems] = useState<ArtifactSummary[]>([]);
  const [categoryById, setCategoryById] = useState<CategoryById>({});
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [artifactsRes, articlesRes] = await Promise.all([
        listWorkspaceArtifacts(workspaceId),
        listArticles({ workspace_id: workspaceId, include_unpublished: true }),
      ]);
      const categories: CategoryById = {};
      for (const article of articlesRes.articles || []) {
        categories[article.id] = article.category;
      }
      setCategoryById(categories);
      setItems(artifactsRes.artifacts || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const typeOptions = useMemo(() => Array.from(new Set(items.map((item) => item.type))).sort(), [items]);
  const statusOptions = useMemo(() => Array.from(new Set(items.map((item) => item.status))).sort(), [items]);
  const categoryOptions = useMemo(
    () => Array.from(new Set(items.map((item) => categoryById[item.id]).filter(Boolean) as string[])).sort(),
    [categoryById, items]
  );

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter.length > 0 && !typeFilter.includes(item.type)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(item.status)) return false;
      const category = categoryById[item.id] || "";
      if (categoryFilter.length > 0 && !categoryFilter.includes(category)) return false;
      if (!search) return true;
      const summary = item.content?.summary || "";
      const tags = (item.content?.tags || []).join(" ");
      const haystack = `${item.title} ${item.slug} ${item.type} ${item.status} ${summary} ${tags}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [items, typeFilter, statusFilter, categoryById, categoryFilter, q]);

  const onMultiSelect = (event: ChangeEvent<HTMLSelectElement>, setter: (next: string[]) => void) => {
    setter(Array.from(event.target.selectedOptions).map((option) => option.value));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>All Artifacts</h2>
          <p className="muted">Generic artifact registry for this workspace.</p>
        </div>
      </div>
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      <section className="card">
        <div className="form-grid">
          <label>
            Search
            <input className="input" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search title, slug, summary, tags" />
          </label>
          <label>
            Artifact Type
            <select multiple value={typeFilter} onChange={(event) => onMultiSelect(event, setTypeFilter)}>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select multiple value={statusFilter} onChange={(event) => onMultiSelect(event, setStatusFilter)}>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          {categoryOptions.length > 0 && (
            <label>
              Category
              <select multiple value={categoryFilter} onChange={(event) => onMultiSelect(event, setCategoryFilter)}>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="inline-actions">
            <button className="ghost" onClick={load} disabled={loading}>
              Refresh
            </button>
            <button
              className="ghost"
              onClick={() => {
                setQ("");
                setTypeFilter([]);
                setStatusFilter([]);
                setCategoryFilter([]);
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>
      <section className="card">
        <div className="card-header">
          <h3>Artifacts</h3>
        </div>
        <div className="instance-list">
          {filtered.map((item) => {
            const category = categoryById[item.id] || "";
            const rowMeta = [item.type, item.status, item.visibility, category || null].filter(Boolean).join(" · ");
            if (item.type === "article") {
              return (
                <Link className="instance-row" key={item.id} to={`/app/artifacts/${item.id}`}>
                  <div>
                    <strong>{item.title}</strong>
                    <span className="muted small">{rowMeta}</span>
                  </div>
                  <div className="muted small">{item.updated_at || "—"}</div>
                </Link>
              );
            }
            return (
              <div className="instance-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span className="muted small">{rowMeta}</span>
                </div>
                <div className="muted small">Detail view coming soon</div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="muted">No artifacts matched your filters.</p>}
        </div>
      </section>
    </>
  );
}
