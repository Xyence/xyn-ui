import { useCallback, useEffect, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import {
  createReleasePlan,
  deleteReleasePlan,
  generateReleasePlan,
  getReleasePlan,
  listReleasePlans,
  updateReleasePlan,
} from "../../api/xyn";
import type { ReleasePlanCreatePayload, ReleasePlanDetail, ReleasePlanSummary } from "../../api/types";

const emptyForm: ReleasePlanCreatePayload = {
  name: "",
  target_kind: "module",
  target_fqn: "",
  from_version: "",
  to_version: "",
};

const TARGET_KINDS = ["module", "bundle", "release"];

export default function ReleasePlansPage() {
  const [items, setItems] = useState<ReleasePlanSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReleasePlanDetail | null>(null);
  const [form, setForm] = useState<ReleasePlanCreatePayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listReleasePlans();
      setItems(data.release_plans);
      if (!selectedId && data.release_plans[0]) {
        setSelectedId(data.release_plans[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedId]);

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
        const detail = await getReleasePlan(selectedId);
        setSelected(detail);
        setForm({
          name: detail.name,
          target_kind: detail.target_kind,
          target_fqn: detail.target_fqn,
          from_version: detail.from_version ?? "",
          to_version: detail.to_version ?? "",
        });
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedId]);

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await createReleasePlan(form);
      setForm(emptyForm);
      await load();
      setMessage("Release plan created.");
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
      await updateReleasePlan(selectedId, form);
      await load();
      setMessage("Release plan updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this release plan?")) return;
    try {
      setLoading(true);
      setError(null);
      await deleteReleasePlan(selectedId);
      setSelectedId(null);
      setSelected(null);
      setForm(emptyForm);
      await load();
      setMessage("Release plan deleted.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await generateReleasePlan(selectedId);
      setMessage(`Release plan generation queued. Run: ${result.run_id}`);
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
          <h2>Release Plans</h2>
          <p className="muted">Track planned changes for modules and bundles.</p>
        </div>
        <button className="ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <div className="layout">
        <section className="card">
          <div className="card-header">
            <h3>Release plans</h3>
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
                  <span className="muted small">{item.target_kind}</span>
                </div>
                <span className="muted small">{item.to_version ?? "—"}</span>
              </button>
            ))}
            {items.length === 0 && <p className="muted">No release plans yet.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>{selected ? "Release plan detail" : "Create release plan"}</h3>
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
              Target kind
              <select
                value={form.target_kind ?? "module"}
                onChange={(event) => setForm({ ...form, target_kind: event.target.value })}
              >
                {TARGET_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Target FQN
              <input
                value={form.target_fqn ?? ""}
                onChange={(event) => setForm({ ...form, target_fqn: event.target.value })}
              />
            </label>
            <label>
              From version
              <input
                value={form.from_version ?? ""}
                onChange={(event) => setForm({ ...form, from_version: event.target.value })}
              />
            </label>
            <label>
              To version
              <input
                value={form.to_version ?? ""}
                onChange={(event) => setForm({ ...form, to_version: event.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" onClick={selected ? handleUpdate : handleCreate} disabled={loading}>
              {selected ? "Save changes" : "Create"}
            </button>
            {selected && (
              <>
                <button className="ghost" onClick={handleGenerate} disabled={loading}>
                  Generate
                </button>
                <button className="danger" onClick={handleDelete} disabled={loading}>
                  Delete
                </button>
              </>
            )}
          </div>
          {selected && (
            <div className="detail-grid">
              <div>
                <div className="label">Target</div>
                <span className="muted">{selected.target_fqn}</span>
              </div>
              <div>
                <div className="label">Updated</div>
                <span className="muted">{selected.updated_at ?? "—"}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
