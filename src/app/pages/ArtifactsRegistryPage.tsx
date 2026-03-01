import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import { installWorkspaceArtifact, listWorkspaceArtifacts, uninstallWorkspaceArtifact } from "../../api/xyn";
import type { WorkspaceInstalledArtifactSummary } from "../../api/types";
import WorkspaceContextBar from "../components/common/WorkspaceContextBar";
import { toWorkspacePath } from "../routing/workspaceRouting";

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function ArtifactsRegistryPage({
  workspaceId,
  workspaceName,
  workspaceColor,
}: {
  workspaceId: string;
  workspaceName: string;
  workspaceColor?: string;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkspaceInstalledArtifactSummary[]>([]);
  const [query, setQuery] = useState("");
  const [installRef, setInstallRef] = useState("");
  const [installing, setInstalling] = useState(false);
  const [uninstallingBindingId, setUninstallingBindingId] = useState<string | null>(null);
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
      const payload = await listWorkspaceArtifacts(workspaceId);
      setItems(payload.artifacts || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!text) return true;
      const haystack = `${item.title || item.name || ""} ${item.description || ""} ${item.kind || ""} ${item.installed_state || ""}`.toLowerCase();
      return haystack.includes(text);
    });
  }, [items, query]);

  const notifyWorkspaceArtifactsChanged = () => {
    window.dispatchEvent(new Event("xyn:workspace-artifacts-changed"));
  };

  const install = async () => {
    if (!workspaceId) return;
    const value = installRef.trim();
    if (!value) return;
    try {
      setInstalling(true);
      setError(null);
      await installWorkspaceArtifact(workspaceId, { artifact_id: value, enabled: true });
      setInstallRef("");
      await load();
      notifyWorkspaceArtifactsChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setInstalling(false);
    }
  };

  const uninstall = async (bindingId: string) => {
    if (!workspaceId || !bindingId) return;
    try {
      setUninstallingBindingId(bindingId);
      setError(null);
      await uninstallWorkspaceArtifact(workspaceId, bindingId);
      await load();
      notifyWorkspaceArtifactsChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUninstallingBindingId(null);
    }
  };

  return (
    <>
      <WorkspaceContextBar workspaceName={workspaceName} workspaceColor={workspaceColor} />

      <div className="page-header">
        <div>
          <h2>Artifact Explorer</h2>
          <p className="muted">Workspace-installed artifacts.</p>
        </div>
      </div>

      {!workspaceId && <InlineMessage tone="error" title="Workspace required" body="Select a workspace to view installed artifacts." />}
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}

      <section className="card">
        <div className="card-header">
          <h3>Installed Artifacts</h3>
          <div className="inline-actions">
            <input
              className="input artifacts-registry-search"
              value={installRef}
              onChange={(event) => setInstallRef(event.target.value)}
              placeholder="Artifact ID or slug"
              aria-label="Artifact id or slug"
            />
            <button className="ghost" onClick={() => void install()} disabled={installing || !workspaceId || !installRef.trim()}>
              {installing ? "Installing..." : "Install"}
            </button>
            <input
              className="input artifacts-registry-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search installed artifacts"
              aria-label="Search installed artifacts"
            />
            <button className="ghost" onClick={() => void load()} disabled={loading || !workspaceId}>
              Refresh
            </button>
          </div>
        </div>
        <div className="instance-list" role="table" aria-label="Workspace installed artifacts">
          <div className="instance-row" role="row">
            <div role="columnheader">
              <strong>Title</strong>
            </div>
            <div role="columnheader" className="muted small">
              Kind · State · Enabled · Updated
            </div>
          </div>
          {filtered.map((item) => (
            <div
              key={item.binding_id}
              className="instance-row"
              role="row"
              tabIndex={0}
              onClick={() => navigate(toWorkspacePath(workspaceId, `build/artifacts/${item.artifact_id}`))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(toWorkspacePath(workspaceId, `build/artifacts/${item.artifact_id}`));
                }
              }}
            >
              <div role="cell">
                <strong>{item.title || item.name}</strong>
                <span className="muted small">{item.description || "-"}</span>
              </div>
              <div role="cell" className="muted small inline-actions">
                {item.kind || "-"} · {item.installed_state || "installed"} · {item.enabled ? "yes" : "no"} · {formatDate(item.updated_at)}
                <details
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <summary className="ghost sm" aria-label={`Actions for ${item.title || item.name}`}>
                    ⋮
                  </summary>
                  <button
                    className="ghost sm"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void uninstall(item.binding_id);
                    }}
                    disabled={uninstallingBindingId === item.binding_id}
                    aria-label={`Uninstall ${item.title || item.name}`}
                  >
                    {uninstallingBindingId === item.binding_id ? "..." : "Uninstall"}
                  </button>
                </details>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="instance-row" role="row">
              <div role="cell">
                <strong>No artifacts installed in this workspace.</strong>
                <span className="muted small">You'll be able to browse and install from the Catalog in a later phase.</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
