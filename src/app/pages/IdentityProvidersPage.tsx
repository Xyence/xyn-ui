import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import {
  createIdentityProvider,
  deleteIdentityProvider,
  listIdentityProviders,
  listSecretStores,
  testIdentityProvider,
  updateIdentityProvider,
} from "../../api/xyn";
import type { IdentityProvider, SecretRef, SecretStore } from "../../api/types";

type ProviderForm = IdentityProvider & {
  client: IdentityProvider["client"] & {
    client_secret_value?: string;
    store_id?: string | null;
  };
};

const emptyForm: ProviderForm = {
  id: "",
  display_name: "",
  enabled: true,
  issuer: "",
  discovery: {
    mode: "issuer",
    jwksUri: "",
    authorizationEndpoint: "",
    tokenEndpoint: "",
    userinfoEndpoint: "",
  },
  client: {
    client_id: "",
    client_secret_ref: { type: "aws.secrets_manager", ref: "" },
    client_secret_value: "",
    store_id: "",
  },
  scopes: ["openid", "profile", "email"],
  pkce: true,
  prompt: "",
  domain_rules: {
    allowedEmailDomains: [],
    allowedHostedDomain: "",
  },
  claims: {
    subject: "sub",
    email: "email",
    emailVerified: "email_verified",
    name: "name",
    givenName: "given_name",
    familyName: "family_name",
    picture: "picture",
  },
  audience_rules: {
    acceptAudiences: [],
    acceptAzp: true,
  },
};

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeProviderPayload = (payload: ProviderForm): Record<string, unknown> => {
  const prompt = (payload.prompt || "").trim();
  const result: Record<string, unknown> = {
    ...payload,
    prompt: prompt ? prompt : null,
  };
  return result;
};

export default function IdentityProvidersPage() {
  const [items, setItems] = useState<IdentityProvider[]>([]);
  const [stores, setStores] = useState<SecretStore[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ProviderForm>(emptyForm);
  const [useExistingSecretRef, setUseExistingSecretRef] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const didAutoSelectRef = useRef(false);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      const [providersData, storesData] = await Promise.all([listIdentityProviders(), listSecretStores()]);
      setItems(providersData.identity_providers);
      setStores(storesData.secret_stores);
      setSelectedId((current) => {
        if (current) return current;
        if (didAutoSelectRef.current) return current;
        const first = providersData.identity_providers[0];
        if (!first) return current;
        didAutoSelectRef.current = true;
        return first.id;
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setForm(emptyForm);
      setUseExistingSecretRef(false);
      return;
    }
    const hasExistingRef = Boolean(selected.client?.client_secret_ref?.ref);
    setForm({
      ...emptyForm,
      ...selected,
      discovery: { ...emptyForm.discovery, ...(selected.discovery || {}) },
      client: {
        client_id: selected.client?.client_id || "",
        client_secret_ref:
          selected.client?.client_secret_ref || ({ type: "aws.secrets_manager", ref: "" } as SecretRef),
        client_secret_value: "",
        store_id: "",
      },
      scopes: selected.scopes?.length ? selected.scopes : ["openid", "profile", "email"],
      domain_rules: {
        allowedEmailDomains: selected.domain_rules?.allowedEmailDomains || [],
        allowedHostedDomain: selected.domain_rules?.allowedHostedDomain || "",
      },
      claims: { ...emptyForm.claims, ...(selected.claims || {}) },
      audience_rules: {
        acceptAudiences: selected.audience_rules?.acceptAudiences || [],
        acceptAzp: selected.audience_rules?.acceptAzp ?? true,
      },
    });
    setUseExistingSecretRef(hasExistingRef);
  }, [selected]);

  const buildPayload = () => {
    const base = normalizeProviderPayload(form) as ProviderForm;
    const client: ProviderForm["client"] = {
      ...base.client,
      client_secret_ref: base.client.client_secret_ref,
    };

    const secretValue = (base.client.client_secret_value || "").trim();
    if (secretValue) {
      client.client_secret_value = secretValue;
      if (base.client.store_id) client.store_id = base.client.store_id;
    } else {
      delete client.client_secret_value;
      delete client.store_id;
      if (!useExistingSecretRef) {
        client.client_secret_ref = base.client.client_secret_ref;
      }
    }

    if (!useExistingSecretRef && !secretValue) {
      delete client.client_secret_ref;
    }

    return {
      ...base,
      client,
    };
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const created = await createIdentityProvider(buildPayload() as IdentityProvider);
      await load();
      setSelectedId(created.id);
      setMessage("Identity provider created.");
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
      await updateIdentityProvider(selectedId, buildPayload() as Partial<IdentityProvider>);
      await load();
      setMessage("Identity provider updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this identity provider?")) return;
    try {
      setLoading(true);
      setError(null);
      await deleteIdentityProvider(selectedId);
      setSelectedId(null);
      didAutoSelectRef.current = false;
      await load();
      setMessage("Identity provider deleted.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await testIdentityProvider(selectedId);
      setTestResult(
        result.ok
          ? `Discovery OK. Auth: ${result.authorization_endpoint || "—"}`
          : `Test failed: ${result}`
      );
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
          <h2>Identity Providers</h2>
          <p className="muted">Configure OIDC providers for platform apps.</p>
        </div>
        <div className="inline-actions">
          <button
            className="ghost"
            onClick={() => {
              setSelectedId(null);
              setForm(emptyForm);
              setUseExistingSecretRef(false);
              setTestResult(null);
            }}
            disabled={loading}
          >
            New provider
          </button>
          <button className="ghost" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}
      {testResult && <InlineMessage tone="info" title="Test" body={testResult} />}

      <div className="layout">
        <section className="card">
          <div className="card-header">
            <h3>Providers</h3>
          </div>
          <div className="instance-list">
            {items.map((item) => (
              <button
                key={item.id}
                className={`instance-row ${selectedId === item.id ? "active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div>
                  <strong>{item.display_name}</strong>
                  <span className="muted small">{item.id}</span>
                </div>
                <div className="muted small">
                  <div>{item.enabled ? "Enabled" : "Disabled"}</div>
                  <div>{item.issuer}</div>
                </div>
              </button>
            ))}
            {items.length === 0 && <p className="muted">No identity providers yet.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>{selectedId ? "Edit provider" : "Create provider"}</h3>
          </div>
          <div className="form-grid">
            <label>
              Provider ID
              <input
                className="input"
                value={form.id}
                onChange={(event) => setForm({ ...form, id: event.target.value })}
              />
            </label>
            <label>
              Display name
              <input
                className="input"
                value={form.display_name}
                onChange={(event) => setForm({ ...form, display_name: event.target.value })}
              />
            </label>
            <label>
              Issuer URL
              <input
                className="input"
                value={form.issuer}
                onChange={(event) => setForm({ ...form, issuer: event.target.value })}
              />
            </label>
            <label>
              Enabled
              <select
                value={form.enabled ? "yes" : "no"}
                onChange={(event) => setForm({ ...form, enabled: event.target.value === "yes" })}
              >
                <option value="yes">Enabled</option>
                <option value="no">Disabled</option>
              </select>
            </label>
            <label>
              Client ID
              <input
                className="input"
                value={form.client.client_id}
                onChange={(event) =>
                  setForm({ ...form, client: { ...form.client, client_id: event.target.value } })
                }
              />
            </label>
            <label>
              Client secret (write-only)
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={form.client.client_secret_value || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    client: { ...form.client, client_secret_value: event.target.value },
                  })
                }
                placeholder={selectedId ? "Leave blank to keep existing" : "Enter client secret"}
              />
            </label>
            <label>
              Secret store (optional)
              <select
                value={form.client.store_id || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    client: { ...form.client, store_id: event.target.value },
                  })
                }
              >
                <option value="">Default store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                    {store.is_default ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Advanced: use existing secret ref
              <select
                value={useExistingSecretRef ? "yes" : "no"}
                onChange={(event) => setUseExistingSecretRef(event.target.value === "yes")}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            {useExistingSecretRef && (
              <>
                <label>
                  Client secret ref type
                  <select
                    value={form.client.client_secret_ref?.type || "aws.secrets_manager"}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        client: {
                          ...form.client,
                          client_secret_ref: {
                            type: event.target.value,
                            ref: form.client.client_secret_ref?.ref || "",
                          },
                        },
                      })
                    }
                  >
                    <option value="aws.secrets_manager">AWS Secrets Manager</option>
                    <option value="aws.ssm">AWS SSM</option>
                    <option value="env">Env (bootstrap only)</option>
                  </select>
                </label>
                <label>
                  Client secret ref
                  <input
                    className="input"
                    value={form.client.client_secret_ref?.ref || ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        client: {
                          ...form.client,
                          client_secret_ref: {
                            type: form.client.client_secret_ref?.type || "aws.secrets_manager",
                            ref: event.target.value,
                          },
                        },
                      })
                    }
                  />
                </label>
              </>
            )}
            <label>
              Scopes (comma)
              <input
                className="input"
                value={(form.scopes || []).join(", ")}
                onChange={(event) => setForm({ ...form, scopes: splitCsv(event.target.value) })}
              />
            </label>
            <label>
              Prompt
              <input
                className="input"
                value={form.prompt || ""}
                onChange={(event) => setForm({ ...form, prompt: event.target.value })}
              />
            </label>
            <label>
              Allowed email domains (comma)
              <input
                className="input"
                value={(form.domain_rules?.allowedEmailDomains || []).join(", ")}
                onChange={(event) =>
                  setForm({
                    ...form,
                    domain_rules: {
                      ...form.domain_rules,
                      allowedEmailDomains: splitCsv(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label>
              Hosted domain hint
              <input
                className="input"
                value={form.domain_rules?.allowedHostedDomain || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    domain_rules: { ...form.domain_rules, allowedHostedDomain: event.target.value },
                  })
                }
              />
            </label>
            <label>
              Discovery mode
              <select
                value={form.discovery?.mode || "issuer"}
                onChange={(event) =>
                  setForm({ ...form, discovery: { ...form.discovery, mode: event.target.value } })
                }
              >
                <option value="issuer">Issuer</option>
                <option value="manual">Manual override</option>
              </select>
            </label>
            <label>
              Authorization endpoint
              <input
                className="input"
                value={form.discovery?.authorizationEndpoint || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    discovery: { ...form.discovery, authorizationEndpoint: event.target.value },
                  })
                }
              />
            </label>
            <label>
              Token endpoint
              <input
                className="input"
                value={form.discovery?.tokenEndpoint || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    discovery: { ...form.discovery, tokenEndpoint: event.target.value },
                  })
                }
              />
            </label>
            <label>
              JWKS URI
              <input
                className="input"
                value={form.discovery?.jwksUri || ""}
                onChange={(event) =>
                  setForm({ ...form, discovery: { ...form.discovery, jwksUri: event.target.value } })
                }
              />
            </label>
            <label>
              Userinfo endpoint
              <input
                className="input"
                value={form.discovery?.userinfoEndpoint || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    discovery: { ...form.discovery, userinfoEndpoint: event.target.value },
                  })
                }
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              className="primary"
              onClick={selectedId ? handleUpdate : handleCreate}
              disabled={loading || !form.id || !form.display_name || !form.issuer || !form.client.client_id}
            >
              {selectedId ? "Update" : "Create"}
            </button>
            <button className="ghost" onClick={handleTest} disabled={loading || !selectedId}>
              Test connection
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
