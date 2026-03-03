import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmsPanelHost, { type ConsolePanelKey, type ConsolePanelSpec } from "../components/console/EmsPanelHost";
import XynConsoleCore from "../components/console/XynConsoleCore";
import { useXynConsole } from "../state/xynConsoleStore";
import { toWorkspacePath } from "../routing/workspaceRouting";

export default function WorkbenchPage() {
  const { setContext } = useXynConsole();
  const params = useParams();
  const workspaceId = String(params.workspaceId || "").trim();
  const [panel, setPanel] = useState<ConsolePanelSpec | null>(null);

  useEffect(() => {
    setContext({ artifact_id: null, artifact_type: null });
  }, [setContext]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Workbench</h2>
          <p className="muted">Console-first workspace runtime with panel outputs.</p>
        </div>
        <div className="inline-actions">
          <Link className="ghost" to={toWorkspacePath(workspaceId, "console")}>
            Open legacy console
          </Link>
        </div>
      </div>

      <section className="xyn-initiate-split">
        <div className="card xyn-initiate-console">
          <XynConsoleCore
            mode="page"
            onOpenPanel={(panelKey, nextParams) =>
              setPanel({
                key: panelKey as ConsolePanelKey,
                params: nextParams || {},
              })
            }
          />
        </div>
        <EmsPanelHost panel={panel} workspaceId={workspaceId} onOpenPanel={setPanel} />
      </section>
    </>
  );
}
