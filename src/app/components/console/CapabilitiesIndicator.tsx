import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listWorkspaceArtifacts } from "../../../api/xyn";
import type { WorkspaceInstalledArtifactSummary } from "../../../api/types";
import { toWorkspacePath } from "../../routing/workspaceRouting";

type CapabilityEntry = {
  key: string;
  title: string;
  slug: string;
  version: string;
  managePath: string;
  docsPath: string;
};

export default function CapabilitiesIndicator({ workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WorkspaceInstalledArtifactSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setRows([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await listWorkspaceArtifacts(workspaceId);
        if (!active) return;
        const filtered = (response.artifacts || []).filter((artifact) => {
          const roles = artifact.manifest_summary?.roles || [];
          return roles.includes("ui_mount") || roles.includes("api_router");
        });
        setRows(filtered);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load capabilities");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [workspaceId]);

  const items = useMemo<CapabilityEntry[]>(
    () =>
      rows.map((artifact) => ({
        key: artifact.binding_id || artifact.artifact_id,
        title: artifact.title || artifact.name || artifact.slug || artifact.artifact_id,
        slug: artifact.slug || artifact.artifact_id,
        version: artifact.version == null ? "-" : String(artifact.version),
        managePath: artifact.manifest_summary?.surfaces?.manage?.[0]?.path || "",
        docsPath: artifact.manifest_summary?.surfaces?.docs?.[0]?.path || "",
      })),
    [rows]
  );

  const openCapability = (entry: CapabilityEntry) => {
    const target = entry.managePath || entry.docsPath;
    if (target) {
      if (/^https?:\/\//i.test(target)) {
        window.location.href = target;
        return;
      }
      const resolved = target.startsWith("/w/")
        ? target
        : target.startsWith("/")
          ? toWorkspacePath(workspaceId, target.replace(/^\/+/, ""))
          : toWorkspacePath(workspaceId, target);
      navigate(resolved);
      setOpen(false);
      return;
    }
    navigate(toWorkspacePath(workspaceId, `build/artifacts?artifact=${encodeURIComponent(entry.slug)}`));
    setOpen(false);
  };

  return (
    <div className="workbench-capabilities">
      <button
        type="button"
        className="ghost workbench-capabilities-button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        Capabilities
        <span className="workbench-capabilities-count">{items.length}</span>
      </button>
      {open ? (
        <div className="workbench-capabilities-popover" role="dialog" aria-label="Capabilities">
          {loading ? <p className="muted small">Loading…</p> : null}
          {error ? <p className="danger-text small">{error}</p> : null}
          {!loading && !error && items.length === 0 ? <p className="muted small">No app capabilities installed.</p> : null}
          {!loading && !error && items.length > 0 ? (
            <ul className="workbench-capabilities-list">
              {items.map((entry) => (
                <li key={entry.key}>
                  <button type="button" className="instance-row workbench-capability-row" onClick={() => openCapability(entry)}>
                    <span>
                      <strong>{entry.title}</strong>
                    </span>
                    <span className="muted small">v{entry.version}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
