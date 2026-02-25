import { useEffect } from "react";
import XynConsoleCore from "../components/console/XynConsoleCore";
import { useXynConsole } from "../state/xynConsoleStore";

const HAPPY_PATH_PROMPTS = [
  "Create an explainer video about Xyn governance ledger for telecom engineers.",
  "Create a guide about RBAC visualization",
  "Open my latest draft",
];

export default function InitiatePage() {
  const { setContext, injectSuggestion, setInputText } = useXynConsole();

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

      <section className="card xyn-initiate-card">
        <div className="card-header">
          <h3>Happy path (V1)</h3>
        </div>
        <ol className="xyn-happy-path-list">
          <li>
            Go to <code>/app/console</code> and submit:
            <code>{HAPPY_PATH_PROMPTS[0]}</code>
          </li>
          <li>
            If you get MissingFields, submit:
            <code>category: guide</code> and <code>intent: telecom engineers evaluating a governance platform</code>
          </li>
          <li>Use <code>Open in Editor</code> from DraftReady.</li>
          <li>
            In editor, open Xyn (⌘K / Ctrl+K) and submit:
            <code>Add tags governance, ledger, access-control. Set duration to 5m.</code>
          </li>
          <li>Review ProposedPatch, then click <code>Apply to Form</code> and <code>Apply &amp; Save</code>.</li>
        </ol>
        <div className="xyn-console-options-list">
          {HAPPY_PATH_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="ghost sm"
              onClick={() => {
                setInputText("");
                injectSuggestion(prompt);
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
