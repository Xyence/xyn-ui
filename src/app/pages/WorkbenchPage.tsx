import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import EmsPanelHost, { type ConsolePanelKey, type ConsolePanelSpec } from "../components/console/EmsPanelHost";
import { useXynConsole } from "../state/xynConsoleStore";
import { toWorkspacePath } from "../routing/workspaceRouting";

export default function WorkbenchPage() {
  const { setContext, setOpen, setInputText, clearSessionResolution, activePanel, setActivePanel } = useXynConsole();
  const params = useParams();
  const workspaceId = String(params.workspaceId || "").trim();
  const panel = (activePanel ? { key: activePanel.key as ConsolePanelKey, params: activePanel.params || {} } : null) as ConsolePanelSpec | null;

  useEffect(() => {
    setContext({ artifact_id: null, artifact_type: null });
    clearSessionResolution();
    setOpen(true);
  }, [clearSessionResolution, setContext, setOpen]);

  const suggestions = [
    "List core artifacts",
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
      <div className="page-header">
        <div>
          <h2>Workbench</h2>
          <p className="muted">Panel-based runtime canvas. Use the Xyn button (top-right) or Cmd/Ctrl+K.</p>
        </div>
        <div className="inline-actions">
          <Link className="ghost" to={toWorkspacePath(workspaceId, "console")}>
            Open legacy console
          </Link>
        </div>
      </div>

      {!panel ? (
        <section className="card workbench-start-card">
          <h3>Start</h3>
          <p className="muted">Pick a suggested command or open the prompt overlay to run anything.</p>
          <div className="workbench-suggestion-grid">
            {suggestions.map((entry) => (
              <button key={entry} type="button" className="ghost workbench-suggestion-chip" onClick={() => handleSuggestion(entry)}>
                {entry}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="workbench-canvas">
        <div className="inline-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="ghost" onClick={() => setActivePanel(null)}>
            Clear panel
          </button>
        </div>
        <EmsPanelHost
          panel={panel}
          workspaceId={workspaceId}
          onOpenPanel={(next) => setActivePanel({ key: next.key, params: next.params || {} })}
        />
      </section>
    </>
  );
}
