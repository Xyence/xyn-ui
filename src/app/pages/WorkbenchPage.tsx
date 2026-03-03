import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listWorkspaceArtifacts } from "../../api/xyn";
import type { WorkspaceInstalledArtifactSummary } from "../../api/types";
import WorkbenchPanelHost, { type ConsolePanelKey, type ConsolePanelSpec } from "../components/console/WorkbenchPanelHost";
import { toWorkspacePath } from "../routing/workspaceRouting";
import { useXynConsole } from "../state/xynConsoleStore";

export default function WorkbenchPage() {
  const { setContext, setOpen, setInputText, clearSessionResolution, activePanel, closePanel, openPanel, setCanvasContext } = useXynConsole();
  const params = useParams();
  const navigate = useNavigate();
  const workspaceId = String(params.workspaceId || "").trim();
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [capabilityRows, setCapabilityRows] = useState<WorkspaceInstalledArtifactSummary[]>([]);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [capabilityLoading, setCapabilityLoading] = useState(false);
  const panel = (activePanel
    ? {
        panel_id: activePanel.panel_id,
        panel_type: activePanel.panel_type,
        instance_key: activePanel.instance_key,
        title: activePanel.title,
        key: activePanel.key as ConsolePanelKey,
        params: activePanel.params || {},
        active_group_id: activePanel.active_group_id,
      }
    : null) as ConsolePanelSpec | null;

  useEffect(() => {
    setContext({ artifact_id: null, artifact_type: null });
    clearSessionResolution();
    setOpen(true);
  }, [clearSessionResolution, setContext, setOpen]);

  useEffect(() => {
    if (!panel) setCanvasContext(null);
  }, [panel, setCanvasContext]);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    (async () => {
      try {
        setCapabilityLoading(true);
        setCapabilityError(null);
        const response = await listWorkspaceArtifacts(workspaceId);
        if (!active) return;
        const filtered = (response.artifacts || []).filter((artifact) => {
          const roles = artifact.manifest_summary?.roles || [];
          return roles.includes("ui_mount") || roles.includes("api_router");
        });
        setCapabilityRows(filtered);
      } catch (error) {
        if (!active) return;
        setCapabilityError(error instanceof Error ? error.message : "Failed to load capabilities");
      } finally {
        if (active) setCapabilityLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [workspaceId]);

  const capabilitiesCount = capabilityRows.length;

  const capabilityList = useMemo(
    () =>
      capabilityRows.map((artifact) => ({
        key: artifact.binding_id || artifact.artifact_id,
        title: artifact.title || artifact.name || artifact.slug || artifact.artifact_id,
        slug: artifact.slug || artifact.artifact_id,
        kind: artifact.kind || "module",
        version: artifact.version == null ? "-" : String(artifact.version),
        managePath: artifact.manifest_summary?.surfaces?.manage?.[0]?.path || "",
        docsPath: artifact.manifest_summary?.surfaces?.docs?.[0]?.path || "",
      })),
    [capabilityRows]
  );

  const openCapability = (entry: { slug: string; managePath: string; docsPath: string }) => {
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
      setCapabilitiesOpen(false);
      return;
    }
    openPanel({ key: "artifact_detail", params: { slug: entry.slug }, open_in: "current_panel" });
    setCapabilitiesOpen(false);
  };

  const suggestions = [
    "List core artifacts",
    "Open platform settings",
    "List workspaces",
    "Show runs",
    "Show failed runs",
    "Show installed artifacts",
    "Open artifact core.authn-jwt",
    "Edit artifact core.authn-jwt raw",
    "Create EMS instance for ACME Co. FQDN ems.xyence.io",
    "Show unregistered devices",
  ];

  const handleSuggestion = (prompt: string) => {
    setInputText(prompt);
    setOpen(true);
  };

  return (
    <>
      <div className="workbench-topbar">
        <div className="workbench-capabilities">
          <button
            type="button"
            className="ghost workbench-capabilities-button"
            onClick={() => setCapabilitiesOpen((current) => !current)}
            aria-expanded={capabilitiesOpen}
            aria-haspopup="dialog"
          >
            Capabilities
            <span className="workbench-capabilities-count">{capabilitiesCount}</span>
          </button>
          {capabilitiesOpen ? (
            <div className="workbench-capabilities-popover" role="dialog" aria-label="Capabilities">
              {capabilityLoading ? <p className="muted small">Loading…</p> : null}
              {capabilityError ? <p className="danger-text small">{capabilityError}</p> : null}
              {!capabilityLoading && !capabilityError && capabilityList.length === 0 ? (
                <p className="muted small">No app capabilities installed.</p>
              ) : null}
              {!capabilityLoading && !capabilityError && capabilityList.length > 0 ? (
                <ul className="workbench-capabilities-list">
                  {capabilityList.map((entry) => (
                    <li key={entry.key}>
                      <button type="button" className="instance-row workbench-capability-row" onClick={() => openCapability(entry)}>
                        <span>
                          <strong>{entry.title}</strong>
                          <span className="muted small">{entry.kind}</span>
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
      </div>

      {!panel ? (
        <div className="workbench-start-shell">
          <section className="card workbench-start-card">
            <h3>Start</h3>
            <div className="workbench-suggestion-grid">
              {suggestions.map((entry) => (
                <button key={entry} type="button" className="ghost workbench-suggestion-chip" onClick={() => handleSuggestion(entry)}>
                  {entry}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <section className="workbench-canvas">
        {panel ? (
          <div className="inline-actions" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                if (activePanel?.panel_id) closePanel(activePanel.panel_id);
              }}
            >
              Clear panel
            </button>
          </div>
        ) : null}
        <WorkbenchPanelHost
          panel={panel}
          workspaceId={workspaceId}
          onOpenPanel={(next) => openPanel({ key: next.key, params: next.params || {}, open_in: "current_panel" })}
          onContextChange={(context) => {
            setCanvasContext((context || null) as never);
          }}
          onClosePanel={() => {
            if (activePanel?.panel_id) closePanel(activePanel.panel_id);
          }}
        />
      </section>
    </>
  );
}
