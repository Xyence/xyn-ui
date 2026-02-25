import { useEffect, useState } from "react";
import type { IntentScript } from "../../../api/types";

type Props = {
  open: boolean;
  script: IntentScript | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (next: IntentScript) => Promise<void> | void;
};

export default function IntentScriptModal({ open, script, saving = false, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"draft" | "final">("draft");
  const [scriptText, setScriptText] = useState("");
  const [jsonText, setJsonText] = useState("{}");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !script) return;
    setTitle(script.title || "");
    setStatus(script.status || "draft");
    setScriptText(script.script_text || "");
    setJsonText(JSON.stringify(script.script_json || {}, null, 2));
    setError(null);
  }, [open, script]);

  if (!open || !script) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !saving && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>Intent Script</h3>
        <div className="form-grid">
          <label>
            Title
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Status
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value as "draft" | "final")}>
              <option value="draft">draft</option>
              <option value="final">final</option>
            </select>
          </label>
          <label>
            Script text
            <textarea className="input" rows={12} value={scriptText} onChange={(event) => setScriptText(event.target.value)} />
          </label>
          <label>
            Script JSON
            <textarea className="input" rows={12} value={jsonText} onChange={(event) => setJsonText(event.target.value)} />
          </label>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="inline-actions" style={{ marginTop: 12 }}>
          <button
            className="primary"
            disabled={saving}
            onClick={async () => {
              setError(null);
              let parsed: Record<string, unknown> = {};
              try {
                parsed = JSON.parse(jsonText || "{}");
              } catch {
                setError("Script JSON is invalid.");
                return;
              }
              const next: IntentScript = {
                ...script,
                title: title.trim() || script.title,
                status,
                script_text: scriptText,
                script_json: parsed,
              };
              await onSave(next);
            }}
          >
            Save
          </button>
          <button className="ghost" disabled={saving} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
