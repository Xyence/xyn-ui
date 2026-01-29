import { useCallback, useEffect, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import {
  createBlueprint,
  deleteBlueprint,
  getBlueprint,
  listBlueprints,
  submitBlueprint,
  updateBlueprint,
} from "../../api/xyn";
import type { BlueprintCreatePayload, BlueprintDetail, BlueprintSummary } from "../../api/types";

const emptyForm: BlueprintCreatePayload = {
  name: "",
  namespace: "core",
  description: "",
};

export default function BlueprintsPage() {
  const [items, setItems] = useState<BlueprintSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<BlueprintDetail | null>(null);
  const [form, setForm] = useState<BlueprintCreatePayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listBlueprints();
      setItems(data.blueprints);
      if (!selectedId && data.blueprints[0]) {
        setSelectedId(data.blueprints[0].id);
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
        const detail = await getBlueprint(selectedId);
        setSelected(detail);
        setForm({
          name: detail.name,
          namespace: detail.namespace,
          description: detail.description ?? "",
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
      await createBlueprint(form);
      setForm(emptyForm);
      await load();
      setMessage("Blueprint created.");
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
      await updateBlueprint(selectedId, form);
      await load();
      setMessage("Blueprint updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this blueprint?")) return;
    try {
      setLoading(true);
      setError(null);
      await deleteBlueprint(selectedId);
      setSelectedId(null);
      setSelected(null);
      setForm(emptyForm);
      await load();
      setMessage("Blueprint deleted.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await submitBlueprint(selectedId);
      setMessage(`Submit queued. Run: ${result.run_id ?? "n/a"}`);
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
          <h2>Blueprints</h2>
          <p className="muted">Manage blueprint specs and submissions.</p>
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
            <h3>Blueprints</h3>
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
                  <span className="muted small">{item.namespace}</span>
                </div>
                <span className="muted small">Rev {item.latest_revision ?? "—"}</span>
              </button>
            ))}
            {items.length === 0 && <p className="muted">No blueprints yet.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>{selected ? "Blueprint detail" : "Create blueprint"}</h3>
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
              Namespace
              <input
                value={form.namespace ?? ""}
                onChange={(event) => setForm({ ...form, namespace: event.target.value })}
              />
            </label>
            <label>
              Description
              <input
                value={form.description ?? ""}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" onClick={selected ? handleUpdate : handleCreate} disabled={loading}>
              {selected ? "Save changes" : "Create"}
            </button>
            {selected && (
              <>
                <button className="ghost" onClick={handleSubmit} disabled={loading}>
                  Submit
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
                <div className="label">Updated</div>
                <span className="muted">{selected.updated_at ?? "—"}</span>
              </div>
              <div>
                <div className="label">Created</div>
                <span className="muted">{selected.created_at ?? "—"}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
