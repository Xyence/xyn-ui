import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import EmsPanelHost, { type EmsPanelSpec, type EmsPanelKey } from "../components/console/EmsPanelHost";
import XynConsoleCore from "../components/console/XynConsoleCore";
import { useXynConsole } from "../state/xynConsoleStore";

export default function InitiatePage() {
  const { setContext } = useXynConsole();
  const params = useParams();
  const workspaceId = String(params.workspaceId || "").trim();
  const [panel, setPanel] = useState<EmsPanelSpec | null>(null);

  useEffect(() => {
    setContext({ artifact_id: null, artifact_type: null });
  }, [setContext]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Initiate</h2>
          <p className="muted">Console-driven operations and demo panels.</p>
        </div>
      </div>

      <section className="xyn-initiate-split">
        <div className="card xyn-initiate-console">
          <XynConsoleCore
            mode="page"
            onOpenPanel={(panelKey, params) =>
              setPanel({
                key: panelKey as EmsPanelKey,
                params: params || {},
              })
            }
          />
        </div>
        <EmsPanelHost panel={panel} workspaceId={workspaceId} />
      </section>
    </>
  );
}
