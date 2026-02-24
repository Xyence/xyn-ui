import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import Tabs from "../components/ui/Tabs";
import { createRoleBinding, deleteRoleBinding, listIdentities, listRoleBindings } from "../../api/xyn";
import type { IdentitySummary, RoleBindingSummary } from "../../api/types";

type AccessTab = "roles" | "users";

const ACCESS_TABS: Array<{ value: AccessTab; label: string }> = [
  { value: "roles", label: "Roles" },
  { value: "users", label: "Users" },
];

const ROLE_OPTIONS = ["platform_owner", "platform_admin", "platform_architect", "platform_operator", "app_user"];

export default function AccessControlPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [identities, setIdentities] = useState<IdentitySummary[]>([]);
  const [selectedIdentityId, setSelectedIdentityId] = useState<string>("");
  const [bindings, setBindings] = useState<RoleBindingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [roleToAssign, setRoleToAssign] = useState<string>("platform_operator");
  const [assignOpen, setAssignOpen] = useState(false);

  const tabParam = String(searchParams.get("tab") || "").trim();
  const activeTab: AccessTab = (ACCESS_TABS.find((item) => item.value === tabParam)?.value || "roles") as AccessTab;

  const selectedIdentity = useMemo(
    () => identities.find((identity) => identity.id === selectedIdentityId) || null,
    [identities, selectedIdentityId]
  );

  const updateTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const loadIdentities = useCallback(async () => {
    const data = await listIdentities();
    setIdentities(data.identities || []);
    setSelectedIdentityId((current) => {
      if (current && data.identities.some((identity) => identity.id === current)) return current;
      return data.identities[0]?.id || "";
    });
  }, []);

  const loadBindings = useCallback(async () => {
    if (!selectedIdentityId) {
      setBindings([]);
      return;
    }
    const data = await listRoleBindings(selectedIdentityId);
    setBindings(data.role_bindings || []);
  }, [selectedIdentityId]);

  const refreshActive = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await loadIdentities();
      if (activeTab === "roles") {
        await loadBindings();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadBindings, loadIdentities]);

  useEffect(() => {
    void refreshActive();
  }, [refreshActive]);

  useEffect(() => {
    if (activeTab !== "roles") return;
    void (async () => {
      try {
        setError(null);
        await loadBindings();
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [activeTab, loadBindings]);

  const handleAssignRole = async () => {
    if (!selectedIdentityId) return;
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await createRoleBinding({ user_identity_id: selectedIdentityId, role: roleToAssign });
      await loadBindings();
      setMessage("Role assigned.");
      setAssignOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (bindingId: string) => {
    if (!window.confirm("Remove this role binding?")) return;
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await deleteRoleBinding(bindingId);
      await loadBindings();
      setMessage("Role removed.");
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
          <h2>Access Control</h2>
          <p className="muted">Manage platform roles and users.</p>
        </div>
        <div className="inline-actions">
          {activeTab === "roles" ? (
            <button className="primary" onClick={() => setAssignOpen(true)} disabled={!selectedIdentityId}>
              Create role
            </button>
          ) : (
            <button className="primary" disabled title="Users are provisioned by external identity providers.">
              Create user
            </button>
          )}
          <button className="ghost" onClick={() => void refreshActive()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <div className="page-tabs">
        <Tabs
          ariaLabel="Access Control tabs"
          value={activeTab}
          onChange={updateTab}
          options={ACCESS_TABS.map((item) => ({ value: item.value, label: item.label }))}
        />
      </div>

      {activeTab === "users" ? (
        <section className="card">
          <div className="card-header">
            <h3>Users</h3>
            <span className="muted">Platform identities authenticated via OIDC.</span>
          </div>
          <div className="instance-list">
            {identities.map((identity) => (
              <div key={identity.id} className="instance-row">
                <div>
                  <strong>{identity.display_name || identity.email || identity.subject}</strong>
                  <span className="muted small">{identity.email || identity.subject}</span>
                  <span className="muted small">
                    Identity provider:{" "}
                    {identity.provider_display_name
                      ? `${identity.provider_display_name}${identity.provider_id ? ` (${identity.provider_id})` : ""}`
                      : identity.provider_id || identity.provider || identity.issuer}
                  </span>
                </div>
                <span className="muted small">{identity.last_login_at || "never"}</span>
              </div>
            ))}
            {identities.length === 0 && <p className="muted">No identities yet.</p>}
          </div>
        </section>
      ) : (
        <div className="layout">
          <section className="card">
            <div className="card-header">
              <h3>Users</h3>
            </div>
            <div className="instance-list">
              {identities.map((identity) => (
                <button
                  key={identity.id}
                  className={`instance-row ${selectedIdentityId === identity.id ? "active" : ""}`}
                  onClick={() => setSelectedIdentityId(identity.id)}
                >
                  <div>
                    <strong>{identity.display_name || identity.email || identity.subject}</strong>
                    <span className="muted small">{identity.email || identity.subject}</span>
                  </div>
                </button>
              ))}
              {identities.length === 0 && <p className="muted">No identities yet.</p>}
            </div>
          </section>
          <section className="card">
            <div className="card-header">
              <h3>Role bindings</h3>
            </div>
            {selectedIdentity ? (
              <div className="stack" style={{ marginBottom: 12 }}>
                <span className="muted small">User: {selectedIdentity.display_name || selectedIdentity.email || selectedIdentity.subject}</span>
                <span className="muted small">
                  Identity provider:{" "}
                  {selectedIdentity.provider_display_name
                    ? `${selectedIdentity.provider_display_name}${selectedIdentity.provider_id ? ` (${selectedIdentity.provider_id})` : ""}`
                    : selectedIdentity.provider_id || selectedIdentity.provider || selectedIdentity.issuer}
                </span>
              </div>
            ) : null}
            <div className="instance-list">
              {bindings.map((binding) => (
                <div key={binding.id} className="instance-row">
                  <div>
                    <strong>{binding.role}</strong>
                    <span className="muted small">{binding.scope_kind}</span>
                  </div>
                  <button className="ghost" onClick={() => void handleRemoveRole(binding.id)}>
                    Remove
                  </button>
                </div>
              ))}
              {bindings.length === 0 && <p className="muted">No roles assigned.</p>}
            </div>
          </section>
        </div>
      )}

      {assignOpen && (
        <div className="modal-backdrop" onClick={loading ? undefined : () => setAssignOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Create role</h3>
            <p className="muted" style={{ marginTop: 0 }}>Assign a platform role to the selected user.</p>
            <div className="form-grid">
              <label>
                User
                <select value={selectedIdentityId} onChange={(event) => setSelectedIdentityId(event.target.value)}>
                  {identities.map((identity) => (
                    <option key={identity.id} value={identity.id}>
                      {identity.display_name || identity.email || identity.subject}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Role
                <select value={roleToAssign} onChange={(event) => setRoleToAssign(event.target.value)}>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="inline-actions">
              <button className="primary" onClick={() => void handleAssignRole()} disabled={loading || !selectedIdentityId}>
                {loading ? "Saving..." : "Assign role"}
              </button>
              <button className="ghost" onClick={() => setAssignOpen(false)} disabled={loading}>Cancel</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
