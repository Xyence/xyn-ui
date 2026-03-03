import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listWorkspaceArtifacts } from "../../../api/xyn";
import type { ArtifactCapability, WorkspaceInstalledArtifactSummary } from "../../../api/types";
import { toWorkspacePath } from "../../routing/workspaceRouting";
import { useXynConsole } from "../../state/xynConsoleStore";

type CapabilityEntry = {
  key: string;
  title: string;
  slug: string;
  version: string;
  visibility: string;
  order: number;
  managePath: string;
  docsPath: string;
};

export default function CapabilitiesIndicator({ workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate();
  const { openPanel } = useXynConsole();
  const [open, setOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
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
        setRows(response.artifacts || []);
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
      rows.map((artifact) => {
        const capability: ArtifactCapability = artifact.capability || artifact.manifest_summary?.capability || { visibility: "hidden" };
        return {
        key: artifact.binding_id || artifact.artifact_id,
        title:
          String(capability.label || "").trim() ||
          artifact.title ||
          artifact.name ||
          artifact.slug ||
          artifact.artifact_id,
        slug: artifact.slug || artifact.artifact_id,
        version: artifact.version == null ? "-" : String(artifact.version),
        visibility: String(capability.visibility || "hidden").toLowerCase() || "hidden",
        order: Number(capability.order ?? 1000) || 1000,
        managePath: artifact.manifest_summary?.surfaces?.manage?.[0]?.path || "",
        docsPath: artifact.manifest_summary?.surfaces?.docs?.[0]?.path || "",
      };
      }),
    [rows]
  );

  const capabilityItems = useMemo(
    () =>
      items
        .filter((entry) => entry.visibility === "capabilities")
        .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title)),
    [items]
  );
  const platformItems = useMemo(
    () =>
      items
        .filter((entry) => entry.visibility === "platform")
        .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title)),
    [items]
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
    openPanel({ key: "artifact_detail", params: { slug: entry.slug }, open_in: "current_panel" });
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
        <span className="workbench-capabilities-count">{capabilityItems.length}</span>
      </button>
      {open ? (
        <div className="workbench-capabilities-popover" role="dialog" aria-label="Capabilities">
          {loading ? <p className="muted small">Loading…</p> : null}
          {error ? <p className="danger-text small">{error}</p> : null}
          {!loading && !error && capabilityItems.length === 0 ? <p className="muted small">No app capabilities installed.</p> : null}
          {!loading && !error && capabilityItems.length > 0 ? (
            <ul className="workbench-capabilities-list">
              {capabilityItems.map((entry) => (
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
          {!loading && !error && platformItems.length > 0 ? (
            <details className="workbench-capabilities-platform" open={platformOpen} onToggle={(event) => setPlatformOpen((event.target as HTMLDetailsElement).open)}>
              <summary className="muted small">Platform ({platformItems.length})</summary>
              <ul className="workbench-capabilities-list">
                {platformItems.map((entry) => (
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
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
