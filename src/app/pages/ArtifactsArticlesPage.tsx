import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import {
  createArticle,
  createArticleCategory,
  createCategoryBinding,
  deleteArticleCategory,
  deleteCategoryBinding,
  listArticleCategories,
  listArticles,
  listCategoryBindings,
  updateArticleCategory,
} from "../../api/xyn";
import type { ArticleCategoryRecord, ArticleSummary, PublishBindingRecord } from "../../api/types";

type CategoryForm = {
  slug: string;
  name: string;
  description: string;
  enabled: boolean;
};

export default function ArtifactsArticlesPage({
  workspaceId,
  canCreate,
}: {
  workspaceId: string;
  canCreate: boolean;
}) {
  const [tab, setTab] = useState<"articles" | "categories">("articles");
  const [items, setItems] = useState<ArticleSummary[]>([]);
  const [categories, setCategories] = useState<ArticleCategoryRecord[]>([]);
  const [bindings, setBindings] = useState<PublishBindingRecord[]>([]);
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState("web");
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [includeDeprecated, setIncludeDeprecated] = useState(false);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({ slug: "", name: "", description: "", enabled: true });
  const [bindingForm, setBindingForm] = useState({ label: "", target_type: "xyn_ui_route", target_value: "", enabled: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    if (!workspaceId) {
      setItems([]);
      return;
    }
    const data = await listArticles({ workspace_id: workspaceId, include_unpublished: true });
    setItems(data.articles || []);
  }, [workspaceId]);

  const loadCategories = useCallback(async () => {
    const data = await listArticleCategories();
    const next = data.categories || [];
    setCategories(next);
    if (!selectedCategorySlug && next.length) {
      setSelectedCategorySlug(next[0].slug);
    }
  }, [selectedCategorySlug]);

  const loadBindings = useCallback(async () => {
    if (!selectedCategorySlug) {
      setBindings([]);
      return;
    }
    const data = await listCategoryBindings(selectedCategorySlug);
    setBindings(data.bindings || []);
  }, [selectedCategorySlug]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([loadArticles(), loadCategories()]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [loadArticles, loadCategories]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    loadBindings();
  }, [loadBindings]);

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

  const categoryOptions = useMemo(() => {
    const options = categories.filter((item) => item.enabled).map((item) => item.slug);
    if (!options.includes("web")) options.unshift("web");
    return options;
  }, [categories]);

  const visibilityOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.visibility_type).filter(Boolean))).sort(),
    [items]
  );

  const selectedCategory = useMemo(
    () => categories.find((item) => item.slug === selectedCategorySlug) || null,
    [categories, selectedCategorySlug]
  );

  const createDraft = async () => {
    if (!title.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await createArticle({ workspace_id: workspaceId, title, category: categorySlug, visibility_type: "private", body_markdown: "" });
      setTitle("");
      await loadArticles();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async () => {
    try {
      setError(null);
      if (!categoryForm.slug.trim() || !categoryForm.name.trim()) {
        setError("Category slug and name are required.");
        return;
      }
      await createArticleCategory({ ...categoryForm, slug: categoryForm.slug.trim().toLowerCase() });
      setCategoryForm({ slug: "", name: "", description: "", enabled: true });
      setMessage("Category created.");
      await loadCategories();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const saveCategory = async () => {
    if (!selectedCategory) return;
    try {
      await updateArticleCategory(selectedCategory.slug, {
        name: selectedCategory.name,
        description: selectedCategory.description,
        enabled: selectedCategory.enabled,
      });
      setMessage("Category updated.");
      await loadCategories();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const removeCategory = async () => {
    if (!selectedCategory) return;
    try {
      await deleteArticleCategory(selectedCategory.slug);
      setMessage("Category deleted.");
      setSelectedCategorySlug("");
      await loadCategories();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const addBinding = async () => {
    if (!selectedCategory) return;
    try {
      await createCategoryBinding(selectedCategory.slug, {
        label: bindingForm.label,
        target_type: bindingForm.target_type,
        target_value: bindingForm.target_value,
        enabled: bindingForm.enabled,
      });
      setBindingForm({ label: "", target_type: "xyn_ui_route", target_value: "", enabled: true });
      await loadBindings();
    } catch (err) {
      setError((err as Error).message);
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
      {message && <InlineMessage tone="info" title="Articles" body={message} />}

      <section className="card compact-card">
        <div className="inline-actions">
          <button className={`${tab === "articles" ? "primary" : "ghost"} tab-toggle`} onClick={() => setTab("articles")}>
            Articles
          </button>
          <button className={`${tab === "categories" ? "primary" : "ghost"} tab-toggle`} onClick={() => setTab("categories")}>
            Categories
          </button>
        </div>
      </section>

      {tab === "articles" && (
        <>
          {canCreate && (
            <section className="card">
              <div className="form-grid">
                <label>
                  New Article Draft
                  <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
                </label>
                <label>
                  Category
                  <select value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)}>
                    {categoryOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
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
                  {Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort().map((value) => (
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
              <div className="checkbox-row">
                <span>Include deprecated</span>
                <input type="checkbox" checked={includeDeprecated} onChange={(event) => setIncludeDeprecated(event.target.checked)} />
              </div>
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
      )}

      {tab === "categories" && (
        <div className="two-col-layout">
          <section className="card">
            <div className="card-header">
              <h3>Category Index</h3>
            </div>
            <div className="stack">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`instance-row ${selectedCategorySlug === category.slug ? "active" : ""}`}
                  onClick={() => setSelectedCategorySlug(category.slug)}
                >
                  <strong>{category.name}</strong>
                  <span className="muted small">{category.slug} · {category.enabled ? "enabled" : "disabled"}</span>
                </button>
              ))}
            </div>
            {canCreate && (
              <div className="stack" style={{ marginTop: 12 }}>
                <h4>Create category</h4>
                <label className="stacked-field">
                  <span>Slug</span>
                  <input className="input" value={categoryForm.slug} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })} />
                </label>
                <label className="stacked-field">
                  <span>Name</span>
                  <input className="input" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} />
                </label>
                <label className="stacked-field">
                  <span>Description</span>
                  <textarea className="input" rows={3} value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} />
                </label>
                <label>
                  Enabled
                  <input type="checkbox" checked={categoryForm.enabled} onChange={(event) => setCategoryForm({ ...categoryForm, enabled: event.target.checked })} />
                </label>
                <button className="primary" onClick={createCategory}>Create category</button>
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <h3>{selectedCategory?.name || "Category"}</h3>
            </div>
            {selectedCategory ? (
              <>
                <div className="form-grid">
                  <label>
                    Slug
                    <input className="input" value={selectedCategory.slug} disabled />
                  </label>
                  <label>
                    Name
                    <input
                      className="input"
                      value={selectedCategory.name}
                      onChange={(event) =>
                        setCategories((prev) => prev.map((item) => (item.id === selectedCategory.id ? { ...item, name: event.target.value } : item)))
                      }
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      className="input"
                      rows={3}
                      value={selectedCategory.description || ""}
                      onChange={(event) =>
                        setCategories((prev) => prev.map((item) => (item.id === selectedCategory.id ? { ...item, description: event.target.value } : item)))
                      }
                    />
                  </label>
                  <label>
                    Enabled
                    <input
                      type="checkbox"
                      checked={selectedCategory.enabled}
                      onChange={(event) =>
                        setCategories((prev) => prev.map((item) => (item.id === selectedCategory.id ? { ...item, enabled: event.target.checked } : item)))
                      }
                    />
                  </label>
                </div>
                <div className="inline-actions">
                  <button className="primary" onClick={saveCategory}>Save category</button>
                  <button className="danger" onClick={removeCategory}>Delete category</button>
                </div>

                <div className="card-header" style={{ marginTop: 12 }}>
                  <h3>Bindings</h3>
                </div>
                <div className="instance-list">
                  {bindings.map((binding) => (
                    <div className="instance-row" key={binding.id}>
                      <div>
                        <strong>{binding.label}</strong>
                        <span className="muted small">{binding.target_type} · {binding.target_value} · {binding.enabled ? "enabled" : "disabled"}</span>
                      </div>
                      {canCreate && (
                        <button className="danger" onClick={async () => {
                          try {
                            await deleteCategoryBinding(selectedCategory.slug, binding.id);
                            await loadBindings();
                          } catch (err) {
                            setError((err as Error).message);
                          }
                        }}>
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                  {bindings.length === 0 && <p className="muted">No bindings for this category.</p>}
                </div>
                {canCreate && (
                  <div className="form-grid">
                    <label>
                      Label
                      <input className="input" value={bindingForm.label} onChange={(event) => setBindingForm({ ...bindingForm, label: event.target.value })} />
                    </label>
                    <label>
                      Target type
                      <select value={bindingForm.target_type} onChange={(event) => setBindingForm({ ...bindingForm, target_type: event.target.value })}>
                        <option value="xyn_ui_route">xyn_ui_route</option>
                        <option value="public_web_path">public_web_path</option>
                        <option value="external_url">external_url</option>
                      </select>
                    </label>
                    <label>
                      Target value
                      <input className="input" value={bindingForm.target_value} onChange={(event) => setBindingForm({ ...bindingForm, target_value: event.target.value })} />
                    </label>
                    <label>
                      Enabled
                      <input type="checkbox" checked={bindingForm.enabled} onChange={(event) => setBindingForm({ ...bindingForm, enabled: event.target.checked })} />
                    </label>
                    <button className="primary" onClick={addBinding}>Add binding</button>
                  </div>
                )}
              </>
            ) : (
              <p className="muted">Select a category.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
