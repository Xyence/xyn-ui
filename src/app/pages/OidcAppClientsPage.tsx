import { useCallback, useEffect, useMemo, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import {
  createOidcAppClient,
  deleteOidcAppClient,
  listIdentityProviders,
  listOidcAppClients,
  updateOidcAppClient,
} from "../../api/xyn";
import type { IdentityProvider, OidcAppClient } from "../../api/types";

const emptyForm: OidcAppClient = {
  id: "",
  app_id: "",
  login_mode: "redirect",
  default_provider_id: "",
  allowed_provider_ids: [],
  redirect_uris: [],
  post_logout_redirect_uris: [],
  session: { cookieName: "", maxAgeSeconds: 28800 },
  token_validation: { issuerStrict: true, clockSkewSeconds: 120 },
};

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function OidcAppClientsPage() {
  const [items, setItems] = useState<OidcAppClient[]>([]);
  const [providers, setProviders] = useState<IdentityProvider[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<OidcAppClient>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      const [clientsData, providersData] = await Promise.all([
        listOidcAppClients(),
        listIdentityProviders(),
      ]);
      setItems(clientsData.oidc_app_clients);
      setProviders(providersData.identity_providers);
      if (!selectedId && clientsData.oidc_app_clients[0]) {
        setSelectedId(clientsData.oidc_app_clients[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setForm(emptyForm);
      return;
    }
    setForm({
      ...emptyForm,
      ...selected,
      allowed_provider_ids: selected.allowed_provider_ids || [],
      redirect_uris: selected.redirect_uris || [],
      post_logout_redirect_uris: selected.post_logout_redirect_uris || [],
      session: selected.session || { cookieName: "", maxAgeSeconds: 28800 },
      token_validation: selected.token_validation || { issuerStrict: true, clockSkewSeconds: 120 },
    });
  }, [selected]);

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await createOidcAppClient(form);
      await load();
      setMessage("OIDC app client created.");
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
      await updateOidcAppClient(selectedId, form);
      await load();
      setMessage("OIDC app client updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this app client?")) return;
    try {
      setLoading(true);
      setError(null);
      await deleteOidcAppClient(selectedId);
      setSelectedId(null);
      await load();
      setMessage("OIDC app client deleted.");
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
          <h2>OIDC App Clients</h2>
          <p className="muted">Bind apps to allowed identity providers.</p>
        </div>
        <div className="inline-actions">
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
            <h3>App clients</h3>
          </div>
          <div className="instance-list">
            {items.map((item) => (
              <button
                key={item.id}
                className={`instance-row ${selectedId === item.id ? "active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div>
                  <strong>{item.app_id}</strong>
                  <span className="muted small">{item.login_mode}</span>
                </div>
                <div className="muted small">
                  <div>Default: {item.default_provider_id || "—"}</div>
                  <div>Allowed: {(item.allowed_provider_ids || []).length}</div>
                </div>
              </button>
            ))}
            {items.length === 0 && <p className="muted">No app clients yet.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>{selectedId ? "Edit app client" : "Create app client"}</h3>
          </div>
          <div className="form-grid">
            <label>
              App ID
              <input
                className="input"
                value={form.app_id}
                onChange={(event) => setForm({ ...form, app_id: event.target.value })}
              />
            </label>
            <label>
              Login mode
              <select
                value={form.login_mode}
                onChange={(event) => setForm({ ...form, login_mode: event.target.value })}
              >
                <option value="redirect">redirect</option>
              </select>
            </label>
            <label>
              Default provider
              <select
                value={form.default_provider_id || ""}
                onChange={(event) => setForm({ ...form, default_provider_id: event.target.value })}
              >
                <option value="">Select default</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Allowed providers (comma)
              <input
                className="input"
                value={(form.allowed_provider_ids || []).join(", ")}
                onChange={(event) =>
                  setForm({ ...form, allowed_provider_ids: splitCsv(event.target.value) })
                }
              />
            </label>
            <label>
              Redirect URIs (comma)
              <input
                className="input"
                value={(form.redirect_uris || []).join(", ")}
                onChange={(event) => setForm({ ...form, redirect_uris: splitCsv(event.target.value) })}
              />
            </label>
            <label>
              Post-logout URIs (comma)
              <input
                className="input"
                value={(form.post_logout_redirect_uris || []).join(", ")}
                onChange={(event) =>
                  setForm({ ...form, post_logout_redirect_uris: splitCsv(event.target.value) })
                }
              />
            </label>
            <label>
              Session cookie name
              <input
                className="input"
                value={form.session?.cookieName || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    session: { ...form.session, cookieName: event.target.value },
                  })
                }
              />
            </label>
            <label>
              Session max age (seconds)
              <input
                className="input"
                type="number"
                value={form.session?.maxAgeSeconds || 28800}
                onChange={(event) =>
                  setForm({
                    ...form,
                    session: { ...form.session, maxAgeSeconds: Number(event.target.value) },
                  })
                }
              />
            </label>
            <label>
              Clock skew (seconds)
              <input
                className="input"
                type="number"
                value={form.token_validation?.clockSkewSeconds || 120}
                onChange={(event) =>
                  setForm({
                    ...form,
                    token_validation: {
                      ...form.token_validation,
                      clockSkewSeconds: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              className="primary"
              onClick={selectedId ? handleUpdate : handleCreate}
              disabled={loading || !form.app_id || !form.redirect_uris.length}
            >
              {selectedId ? "Update" : "Create"}
            </button>
            <button className="danger" onClick={handleDelete} disabled={loading || !selectedId}>
              Delete
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
