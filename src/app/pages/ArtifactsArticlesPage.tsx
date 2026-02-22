import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import { createArticle, listArticles } from "../../api/xyn";
import type { ArticleSummary } from "../../api/types";

export default function ArtifactsArticlesPage({
  workspaceId,
  canCreate,
}: {
  workspaceId: string;
  canCreate: boolean;
}) {
  const [items, setItems] = useState<ArticleSummary[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"web" | "guide" | "core-concepts" | "release-note" | "internal" | "tutorial">("web");
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [includeDeprecated, setIncludeDeprecated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setItems([]);
      return;
    }
    try {
      setError(null);
      const data = await listArticles({ workspace_id: workspaceId, include_unpublished: true });
      setItems(data.articles || []);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return items.filter((item) => {
      if (!includeDeprecated && item.status === "deprecated") return false;
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (visibilityFilter && item.visibility_type !== visibilityFilter) return false;
      if (!search) return true;
      const haystack = `${item.title} ${item.slug || ""} ${item.summary || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [categoryFilter, includeDeprecated, items, q, visibilityFilter]);

  const categoryOptions = useMemo(() => Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort(), [items]);
  const visibilityOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.visibility_type).filter(Boolean))).sort(),
    [items]
  );

  const createDraft = async () => {
    if (!title.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await createArticle({ workspace_id: workspaceId, title, category, visibility_type: "private", body_markdown: "" });
      setTitle("");
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
          <h2>Articles</h2>
          <p className="muted">Governed article artifacts in this workspace.</p>
        </div>
      </div>
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {canCreate && (
        <section className="card">
          <div className="form-grid">
            <label>
              New Article Draft
              <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
            </label>
            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
                <option value="web">web</option>
                <option value="guide">guide</option>
                <option value="core-concepts">core-concepts</option>
                <option value="release-note">release-note</option>
                <option value="internal">internal</option>
                <option value="tutorial">tutorial</option>
              </select>
            </label>
            <button className="primary" onClick={createDraft} disabled={loading || !title.trim()}>
              Create draft
            </button>
          </div>
        </section>
      )}
      <section className="card">
        <div className="form-grid">
          <label>
            Search
            <input className="input" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search title, slug, summary, tags" />
          </label>
          <label>
            Category
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">All categories</option>
              {categoryOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Visibility
            <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)}>
              <option value="">All visibility</option>
              {visibilityOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Include deprecated
            <input type="checkbox" checked={includeDeprecated} onChange={(event) => setIncludeDeprecated(event.target.checked)} />
          </label>
        </div>
      </section>
      <section className="card">
        <div className="card-header">
          <h3>Articles</h3>
        </div>
        <div className="instance-list">
          {filtered.map((item) => (
            <Link className="instance-row" key={item.id} to={`/app/artifacts/${item.id}`}>
              <div>
                <strong>{item.title}</strong>
                <span className="muted small">
                  {item.slug || item.id} · {item.category} · {item.visibility_type}
                </span>
              </div>
              <div className="muted small">{item.status}</div>
            </Link>
          ))}
          {filtered.length === 0 && <p className="muted">No articles matched your filters.</p>}
        </div>
      </section>
    </>
  );
}
