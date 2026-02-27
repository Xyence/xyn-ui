import { useEffect } from "react";
import XynConsoleCore from "../components/console/XynConsoleCore";
import { useXynConsole } from "../state/xynConsoleStore";

export default function InitiatePage() {
  const { setContext } = useXynConsole();

  useEffect(() => {
    setContext({ artifact_id: null, artifact_type: null });
  }, [setContext]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Initiate</h2>
          <p className="muted">Everything begins as a governed draft.</p>
        </div>
      </div>

      <section className="card xyn-initiate-card">
        <XynConsoleCore mode="page" />
      </section>
    </>
  );
}
