import { useEffect, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import type { AiPurpose } from "../../api/types";
import { listAiPurposes, updateAiPurpose } from "../../api/xyn";

export default function AIPurposesPage() {
  const [items, setItems] = useState<AiPurpose[]>([]);
  const [selected, setSelected] = useState<AiPurpose | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const data = await listAiPurposes();
      setItems(data.purposes || []);
      setSelected((prev) => (prev ? (data.purposes || []).find((item) => item.slug === prev.slug) || data.purposes?.[0] || null : data.purposes?.[0] || null));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!selected) return;
    try {
      setError(null);
      setMessage(null);
      await updateAiPurpose(selected.slug, {
        enabled: selected.enabled,
        system_prompt_markdown: selected.system_prompt_markdown,
      });
      setMessage("Purpose updated.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>AI Purposes</h2>
          <p className="muted">Purpose is the routing key used to filter/select agents (coding, documentation, etc.).</p>
        </div>
        <div className="inline-actions">
          <button className="ghost" onClick={load}>Refresh</button>
          <button className="primary" onClick={save} disabled={!selected}>Save</button>
        </div>
      </div>
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <div className="layout">
        <section className="card">
          <div className="card-header"><h3>Purposes</h3></div>
          <div className="instance-list">
            {items.map((item) => (
              <button key={item.slug} className={`instance-row ${selected?.slug === item.slug ? "selected" : ""}`} onClick={() => setSelected(item)}>
                <div>
                  <strong>{item.name || item.slug}</strong>
                  <span className="muted small">{item.slug}</span>
                </div>
                <span className="muted">{item.enabled ? "enabled" : "disabled"}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header"><h3>Purpose detail</h3></div>
          {!selected ? (
            <p className="muted">Select a purpose.</p>
          ) : (
            <div className="form-grid">
              <label>
                Slug
                <input className="input" value={selected.slug} disabled />
              </label>
              <label>
                Enabled
                <select value={selected.enabled ? "yes" : "no"} onChange={(event) => setSelected({ ...selected, enabled: event.target.value === "yes" })}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label>
                System prompt
                <textarea className="input" rows={12} value={selected.system_prompt_markdown || ""} onChange={(event) => setSelected({ ...selected, system_prompt_markdown: event.target.value })} />
              </label>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
