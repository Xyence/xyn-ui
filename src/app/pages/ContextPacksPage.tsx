import { useCallback, useEffect, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import {
  activateContextPack,
  createContextPack,
  deactivateContextPack,
  getContextPack,
  listContextPacks,
  updateContextPack,
} from "../../api/xyn";
import type { ContextPackCreatePayload, ContextPackDetail, ContextPackSummary } from "../../api/types";

const PURPOSE_OPTIONS = ["any", "planner", "coder", "deployer", "operator"];
const SCOPE_OPTIONS = ["global", "namespace", "project"];

const emptyForm: ContextPackCreatePayload = {
  name: "",
  purpose: "any",
  scope: "global",
  namespace: "",
  project_key: "",
  version: "0.1.0",
  is_active: true,
  is_default: false,
  content_markdown: "",
  applies_to_json: {},
};

export default function ContextPacksPage() {
  const [items, setItems] = useState<ContextPackSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContextPackDetail | null>(null);
  const [form, setForm] = useState<ContextPackCreatePayload>(emptyForm);
  const [appliesText, setAppliesText] = useState<string>("{}");
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listContextPacks(showInactive ? {} : { active: true });
      setItems(data.context_packs);
      if (!selectedId && data.context_packs[0]) {
        setSelectedId(data.context_packs[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedId, showInactive]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    (async () => {
      try {
        const detail = await getContextPack(selectedId);
        setSelected(detail);
        setForm({
          name: detail.name,
          purpose: detail.purpose,
          scope: detail.scope,
          namespace: detail.namespace ?? "",
          project_key: detail.project_key ?? "",
          version: detail.version,
          is_active: detail.is_active,
          is_default: detail.is_default,
          content_markdown: detail.content_markdown ?? "",
          applies_to_json: detail.applies_to_json ?? {},
        });
        setAppliesText(JSON.stringify(detail.applies_to_json ?? {}, null, 2));
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedId]);

  const buildPayload = () => {
    let applies = {};
    if (appliesText.trim().length > 0) {
      applies = JSON.parse(appliesText);
    }
    return {
      ...form,
      applies_to_json: applies,
    };
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const payload = buildPayload();
      await createContextPack(payload);
      setForm(emptyForm);
      setAppliesText("{}");
      await load();
      setMessage("Context pack created.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const payload = buildPayload();
      await updateContextPack(selectedId, payload);
      await load();
      setMessage("Context pack updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      await activateContextPack(selectedId);
      await load();
      setMessage("Context pack activated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      await deactivateContextPack(selectedId);
      await load();
      setMessage("Context pack deactivated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Context Packs</h2>
          <p className="muted">Manage reusable context for planners, coders, and operators.</p>
        </div>
        <div className="inline-actions">
          <label className="muted small">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />{" "}
            Show inactive
          </label>
          <button className="ghost" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <div className="layout">
        <section className="card">
          <div className="card-header">
            <h3>Packs</h3>
          </div>
          <div className="instance-list">
            {items.map((item) => (
              <button
                key={item.id}
                className={`instance-row ${selectedId === item.id ? "active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted small">{item.scope}</span>
                </div>
                <span className="muted small">
                  {item.purpose} · v{item.version}
                </span>
              </button>
            ))}
            {items.length === 0 && <p className="muted">No context packs yet.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>{selected ? "Context pack detail" : "Create context pack"}</h3>
          </div>
          <div className="form-grid">
            <label>
              Name
              <input
                value={form.name ?? ""}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label>
              Purpose
              <select
                value={form.purpose ?? "any"}
                onChange={(event) => setForm({ ...form, purpose: event.target.value })}
              >
                {PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Scope
              <select
                value={form.scope ?? "global"}
                onChange={(event) => setForm({ ...form, scope: event.target.value })}
              >
                {SCOPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Namespace
              <input
                value={form.namespace ?? ""}
                onChange={(event) => setForm({ ...form, namespace: event.target.value })}
              />
            </label>
            <label>
              Project key
              <input
                value={form.project_key ?? ""}
                onChange={(event) => setForm({ ...form, project_key: event.target.value })}
              />
            </label>
            <label>
              Version
              <input
                value={form.version ?? ""}
                onChange={(event) => setForm({ ...form, version: event.target.value })}
              />
            </label>
            <label>
              Active
              <select
                value={form.is_active ? "true" : "false"}
                onChange={(event) => setForm({ ...form, is_active: event.target.value === "true" })}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <label>
              Default
              <select
                value={form.is_default ? "true" : "false"}
                onChange={(event) => setForm({ ...form, is_default: event.target.value === "true" })}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
            <label>
              Applies to (JSON)
              <textarea
                rows={6}
                value={appliesText}
                onChange={(event) => setAppliesText(event.target.value)}
                placeholder='{"task_type": "codegen"}'
              />
            </label>
            <label>
              Content (Markdown)
              <textarea
                rows={10}
                value={form.content_markdown ?? ""}
                onChange={(event) => setForm({ ...form, content_markdown: event.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" onClick={selected ? handleUpdate : handleCreate} disabled={loading}>
              {selected ? "Save changes" : "Create"}
            </button>
            {selected && (
              <>
                <button className="ghost" onClick={handleActivate} disabled={loading}>
                  Activate
                </button>
                <button className="ghost" onClick={handleDeactivate} disabled={loading}>
                  Deactivate
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
