import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import { listArtifacts } from "../../api/xyn";
import type { UnifiedArtifact, UnifiedArtifactState, UnifiedArtifactType } from "../../api/types";

const TYPE_OPTIONS: Array<{ value: "" | UnifiedArtifactType; label: string }> = [
  { value: "", label: "All" },
  { value: "draft_session", label: "Draft Sessions" },
  { value: "blueprint", label: "Blueprints" },
];

const STATE_OPTIONS: Array<{ value: UnifiedArtifactState; label: string }> = [
  { value: "provisional", label: "Provisional" },
  { value: "canonical", label: "Canonical" },
  { value: "immutable", label: "Immutable" },
  { value: "deprecated", label: "Deprecated" },
];

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatOwner(item: UnifiedArtifact): string {
  if (!item.owner) return "—";
  return item.owner.display_name || item.owner.email || item.owner.id;
}

export default function ArtifactsRegistryPage({ workspaceId: _workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<UnifiedArtifact[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | UnifiedArtifactType>("");
  const [stateFilter, setStateFilter] = useState<Set<UnifiedArtifactState>>(
    () => new Set<UnifiedArtifactState>(["provisional", "canonical", "immutable"])
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = await listArtifacts({
        type: typeFilter || undefined,
        query: query.trim() || undefined,
        limit: 500,
        offset: 0,
      });
      setItems(payload.artifacts || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return items.filter((item) => {
      const state = String(item.artifact_state || "").toLowerCase() as UnifiedArtifactState;
      if (!stateFilter.has(state)) return false;
      if (!text) return true;
      const haystack = `${item.title} ${item.summary || ""} ${item.source_ref_type || ""} ${item.source_ref_id || ""}`.toLowerCase();
      return haystack.includes(text);
    });
  }, [items, query, stateFilter]);

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const key = String(item.artifact_state || "").toLowerCase();
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [items]);

  const toggleStateFilter = (state: UnifiedArtifactState, checked: boolean) => {
    setStateFilter((current) => {
      const next = new Set(current);
      if (checked) next.add(state);
      else next.delete(state);
      return next;
    });
  };

  const navigateForArtifact = (item: UnifiedArtifact) => {
    const source = (item.source || {}) as Record<string, unknown>;
    if (item.artifact_type === "draft_session") {
      const sessionId = String(source.id || item.source_ref_id || "").trim();
      if (sessionId) navigate(`/app/drafts/${sessionId}`);
      return;
    }
    if (item.artifact_type === "blueprint") {
      const blueprintId = String(source.id || item.source_ref_id || "").trim();
      if (blueprintId) navigate(`/app/blueprints/${blueprintId}`);
      return;
    }
    if (item.artifact_type === "article") {
      const artifactId = String(item.artifact_id || item.id || "").trim();
      if (artifactId) navigate(`/app/artifacts/${artifactId}`);
      return;
    }
    if (item.artifact_type === "context_pack") {
      const packId = String(source.id || item.source_ref_id || "").trim();
      if (packId) navigate(`/app/context-packs?pack=${encodeURIComponent(packId)}`);
      else navigate("/app/context-packs");
      return;
    }
    if (item.artifact_type === "workflow") {
      const workflowId = String(source.id || item.source_ref_id || "").trim();
      navigate(`/app/artifacts/workflows${workflowId ? `?workflow=${encodeURIComponent(workflowId)}` : ""}`);
      return;
    }
    if (item.artifact_type === "module") {
      navigate("/app/modules");
      return;
    }
    const artifactId = String(item.artifact_id || item.id || "").trim();
    if (artifactId) {
      navigate(`/app/artifacts/${artifactId}`);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Artifact Explorer</h2>
          <p className="muted">Unified artifacts index across Draft Sessions and Blueprints.</p>
        </div>
        <div className="inline-actions">
          <button
            className="ghost"
            data-testid="artifact-explorer-start-tour"
            onClick={() => window.dispatchEvent(new CustomEvent("xyn:start-tour", { detail: { slug: "platform-build-tour" } }))}
          >
            Start Tour
          </button>
          <button className="ghost" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}

      <section className="card">
        <div className="form-grid">
          <label>
            Search
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title"
            />
          </label>
          <label>
            Type
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "" | UnifiedArtifactType)}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="muted small">State</span>
            <div className="inline-actions artifact-state-multiselect">
              {STATE_OPTIONS.map((option) => (
                <label key={option.value} className="muted small">
                  <input
                    type="checkbox"
                    checked={stateFilter.has(option.value)}
                    onChange={(event) => toggleStateFilter(option.value, event.target.checked)}
                  />{" "}
                  {option.label} ({stateCounts[option.value] || 0})
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h3>Artifacts</h3>
        </div>
        <div className="instance-list" role="table" aria-label="Artifact Explorer">
          <div className="instance-row" role="row">
            <div role="columnheader">
              <strong>Title</strong>
            </div>
            <div role="columnheader" className="muted small">
              Type · State · Updated · Owner
            </div>
          </div>
          {filtered.map((item) => (
            <button
              key={item.id}
              className="instance-row"
              role="row"
              onClick={() => navigateForArtifact(item)}
              type="button"
            >
              <div role="cell">
                <strong>{item.title}</strong>
                <span className="muted small">{item.summary || "—"}</span>
              </div>
              <div role="cell" className="muted small">
                {item.artifact_type} · {item.artifact_state} · {formatDate(item.updated_at)} · {formatOwner(item)}
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="muted">No artifacts matched your filters.</p>}
        </div>
      </section>
    </>
  );
}
