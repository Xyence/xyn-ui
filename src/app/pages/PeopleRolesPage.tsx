import { useCallback, useEffect, useMemo, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import { createWorkspaceMembership, listIdentities, listWorkspaceMemberships, updateWorkspaceMembership } from "../../api/xyn";
import type { IdentitySummary, WorkspaceMembershipSummary } from "../../api/types";

const ROLE_OPTIONS = ["reader", "contributor", "publisher", "moderator", "admin"];

export default function PeopleRolesPage({ workspaceId, canAdmin }: { workspaceId: string; canAdmin: boolean }) {
  const [memberships, setMemberships] = useState<WorkspaceMembershipSummary[]>([]);
  const [identities, setIdentities] = useState<IdentitySummary[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState("");
  const [role, setRole] = useState("reader");
  const [terminationAuthority, setTerminationAuthority] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setMemberships([]);
      return;
    }
    try {
      setError(null);
      const [membersData, identitiesData] = await Promise.all([
        listWorkspaceMemberships(workspaceId),
        listIdentities(),
      ]);
      setMemberships(membersData.memberships || []);
      setIdentities(identitiesData.identities || []);
      if (!selectedIdentity && identitiesData.identities?.[0]) setSelectedIdentity(identitiesData.identities[0].id);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [workspaceId, selectedIdentity]);

  useEffect(() => {
    load();
  }, [load]);

  const availableIdentities = useMemo(
    () => identities.filter((id) => !memberships.some((m) => m.user_identity_id === id.id)),
    [identities, memberships]
  );

  const addMember = async () => {
    if (!selectedIdentity) return;
    try {
      await createWorkspaceMembership(workspaceId, {
        user_identity_id: selectedIdentity,
        role,
        termination_authority: terminationAuthority,
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const updateMember = async (membershipId: string, nextRole: string) => {
    try {
      await updateWorkspaceMembership(workspaceId, membershipId, { role: nextRole });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>People & Roles</h2>
          <p className="muted">Workspace role assignments and termination authority.</p>
        </div>
      </div>
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {canAdmin && (
        <section className="card">
          <div className="form-grid">
            <label>
              Identity
              <select value={selectedIdentity} onChange={(event) => setSelectedIdentity(event.target.value)}>
                {availableIdentities.map((identity) => (
                  <option key={identity.id} value={identity.id}>
                    {identity.display_name || identity.email || identity.subject}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Role
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Termination authority
              <input type="checkbox" checked={terminationAuthority} onChange={(event) => setTerminationAuthority(event.target.checked)} />
            </label>
            <button className="primary" onClick={addMember} disabled={!selectedIdentity}>Add member</button>
          </div>
        </section>
      )}
      <section className="card">
        <div className="instance-list">
          {memberships.map((m) => (
            <div className="instance-row" key={m.id}>
              <div>
                <strong>{m.display_name || m.email || m.user_identity_id}</strong>
                <span className="muted small">{m.email || ""}</span>
              </div>
              {canAdmin ? (
                <select value={m.role} onChange={(event) => updateMember(m.id, event.target.value)}>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <span className="muted small">{m.role}</span>
              )}
            </div>
          ))}
          {memberships.length === 0 && <p className="muted">No members in workspace.</p>}
        </div>
      </section>
    </>
  );
}
