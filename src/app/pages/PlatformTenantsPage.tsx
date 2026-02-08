import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import {
  createTenant,
  deleteTenant,
  listTenants,
  updateTenant,
} from "../../api/xyn";
import type { Tenant, TenantCreatePayload } from "../../api/types";

const emptyForm: TenantCreatePayload = {
  name: "",
  slug: "",
  status: "active",
};

export default function PlatformTenantsPage() {
  const [items, setItems] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantCreatePayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listTenants();
      setItems(data.tenants);
      if (!selectedId && data.tenants[0]) {
        setSelectedId(data.tenants[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const selected = items.find((item) => item.id === selectedId);
    if (!selected) {
      setForm(emptyForm);
      return;
    }
    setForm({
      name: selected.name,
      slug: selected.slug,
      status: selected.status,
    });
  }, [items, selectedId]);

  const handleCreate = async () => {
    try {
      setLoading(true);
      setMessage(null);
      setError(null);
      await createTenant(form);
      setForm(emptyForm);
      await load();
      setMessage("Tenant created.");
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
      setMessage(null);
      setError(null);
      await updateTenant(selectedId, form);
      await load();
      setMessage("Tenant updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Suspend this tenant?")) return;
    try {
      setLoading(true);
      setError(null);
      await deleteTenant(selectedId);
      setSelectedId(null);
      await load();
      setMessage("Tenant suspended.");
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
          <h2>Tenants</h2>
          <p className="muted">Manage customer organizations.</p>
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
            <h3>Tenants</h3>
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
                  <span className="muted small">{item.slug}</span>
                </div>
                <span className="muted small">{item.status}</span>
              </button>
            ))}
            {items.length === 0 && <p className="muted">No tenants yet.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>{selectedId ? "Tenant detail" : "Create tenant"}</h3>
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
              Slug
              <input
                value={form.slug ?? ""}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
              />
            </label>
            <label>
              Status
              <select
                value={form.status ?? "active"}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                <option value="active">active</option>
                <option value="suspended">suspended</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" onClick={selectedId ? handleUpdate : handleCreate} disabled={loading}>
              {selectedId ? "Save changes" : "Create"}
            </button>
            {selectedId && (
              <>
                <button className="ghost" disabled={loading}>
                  <Link to={`/app/platform/tenants/${selectedId}`}>Manage contacts</Link>
                </button>
                <button className="danger" onClick={handleDelete} disabled={loading}>
                  Suspend
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
