import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import {
  createContact,
  deleteContact,
  listContacts,
  updateContact,
} from "../../api/xyn";
import type { Contact, ContactCreatePayload } from "../../api/types";

const emptyForm: ContactCreatePayload = {
  name: "",
  email: "",
  phone: "",
  role_title: "",
  status: "active",
};

export default function PlatformTenantContactsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactCreatePayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      setError(null);
      const data = await listContacts(tenantId);
      setContacts(data.contacts);
      if (!selectedId && data.contacts[0]) {
        setSelectedId(data.contacts[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [tenantId, selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const selected = contacts.find((item) => item.id === selectedId);
    if (!selected) {
      setForm(emptyForm);
      return;
    }
    setForm({
      name: selected.name,
      email: selected.email ?? "",
      phone: selected.phone ?? "",
      role_title: selected.role_title ?? "",
      status: selected.status,
    });
  }, [contacts, selectedId]);

  const handleCreate = async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      setMessage(null);
      setError(null);
      await createContact(tenantId, form);
      setForm(emptyForm);
      await load();
      setMessage("Contact created.");
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
      await updateContact(selectedId, form);
      await load();
      setMessage("Contact updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Deactivate this contact?")) return;
    try {
      setLoading(true);
      setError(null);
      await deleteContact(selectedId);
      setSelectedId(null);
      await load();
      setMessage("Contact deactivated.");
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
          <h2>Contacts</h2>
          <p className="muted">Manage tenant contacts.</p>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={load} disabled={loading}>
            Refresh
          </button>
          <Link className="ghost" to="/app/platform/tenants">
            Back to tenants
          </Link>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <div className="layout">
        <section className="card">
          <div className="card-header">
            <h3>Contacts</h3>
          </div>
          <div className="instance-list">
            {contacts.map((item) => (
              <button
                key={item.id}
                className={`instance-row ${selectedId === item.id ? "active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted small">{item.email}</span>
                </div>
                <span className="muted small">{item.status}</span>
              </button>
            ))}
            {contacts.length === 0 && <p className="muted">No contacts yet.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>{selectedId ? "Contact detail" : "Create contact"}</h3>
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
              Email
              <input
                value={form.email ?? ""}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label>
              Phone
              <input
                value={form.phone ?? ""}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </label>
            <label>
              Title
              <input
                value={form.role_title ?? ""}
                onChange={(event) => setForm({ ...form, role_title: event.target.value })}
              />
            </label>
            <label>
              Status
              <select
                value={form.status ?? "active"}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" onClick={selectedId ? handleUpdate : handleCreate} disabled={loading}>
              {selectedId ? "Save changes" : "Create"}
            </button>
            {selectedId && (
              <button className="danger" onClick={handleDelete} disabled={loading}>
                Deactivate
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
