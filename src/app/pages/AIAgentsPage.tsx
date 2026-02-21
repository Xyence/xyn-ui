import { useEffect, useMemo, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import type { AiAgent, AiModelConfig, AiPurpose } from "../../api/types";
import { createAiAgent, deleteAiAgent, listAiAgents, listAiModelConfigs, listAiPurposes, updateAiAgent } from "../../api/xyn";

type AgentFormState = {
  id: string;
  slug: string;
  name: string;
  model_config_id: string;
  system_prompt_text: string;
  purposes: string[];
  enabled: boolean;
  is_default: boolean;
};

function toAgentForm(item: AiAgent): AgentFormState {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    model_config_id: item.model_config_id,
    system_prompt_text: item.system_prompt_text || "",
    purposes: item.purposes || [],
    enabled: item.enabled,
    is_default: Boolean(item.is_default),
  };
}

export default function AIAgentsPage() {
  const [purposes, setPurposes] = useState<AiPurpose[]>([]);
  const [modelConfigs, setModelConfigs] = useState<AiModelConfig[]>([]);
  const [items, setItems] = useState<AiAgent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filterPurpose, setFilterPurpose] = useState("all");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AgentFormState | null>(null);
  const [form, setForm] = useState({
    slug: "",
    name: "",
    model_config_id: "",
    system_prompt_text: "",
    purposes: ["documentation"] as string[],
  });

  const selectedAgent = useMemo(() => items.find((item) => item.id === selectedAgentId) || null, [items, selectedAgentId]);

  const load = async () => {
    try {
      setError(null);
      const [purposeData, modelData, agentData] = await Promise.all([
        listAiPurposes(),
        listAiModelConfigs(),
        listAiAgents(filterPurpose !== "all" ? { purpose: filterPurpose } : undefined),
      ]);
      const activePurposes = (purposeData.purposes || []).filter((item) => (item.status || (item.enabled ? "active" : "deprecated")) === "active");
      const nextItems = agentData.agents || [];
      setPurposes(activePurposes);
      setModelConfigs((modelData.model_configs || []).filter((item) => item.enabled));
      setItems(nextItems);
      if (!form.model_config_id && modelData.model_configs?.[0]?.id) {
        setForm((prev) => ({ ...prev, model_config_id: modelData.model_configs?.[0]?.id || "" }));
      }
      const nextSelected = selectedAgentId && nextItems.some((item) => item.id === selectedAgentId)
        ? nextItems.find((item) => item.id === selectedAgentId) || null
        : nextItems[0] || null;
      setSelectedAgentId(nextSelected?.id || null);
      setEditForm(nextSelected ? toAgentForm(nextSelected) : null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, [filterPurpose]);

  const create = async () => {
    try {
      setError(null);
      setMessage(null);
      await createAiAgent({
        slug: form.slug.trim(),
        name: form.name.trim(),
        model_config_id: form.model_config_id,
        system_prompt_text: form.system_prompt_text,
        enabled: true,
        purposes: form.purposes,
      });
      setForm({ ...form, slug: "", name: "", system_prompt_text: "" });
      setMessage("Agent created.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const saveEdit = async () => {
    if (!editForm) return;
    try {
      setError(null);
      setMessage(null);
      await updateAiAgent(editForm.id, {
        name: editForm.name.trim(),
        model_config_id: editForm.model_config_id,
        system_prompt_text: editForm.system_prompt_text,
        purposes: editForm.purposes,
        enabled: editForm.enabled,
        is_default: editForm.is_default,
      });
      setMessage("Agent updated.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const remove = async (item: AiAgent) => {
    if (!window.confirm(`Delete agent '${item.name}'?`)) return;
    try {
      setError(null);
      setMessage(null);
      await deleteAiAgent(item.id);
      setMessage("Agent deleted.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>AI Agents</h2>
          <p className="muted">Bind model configs + system prompts and tag by purpose.</p>
        </div>
        <div className="inline-actions">
          <select value={filterPurpose} onChange={(event) => setFilterPurpose(event.target.value)}>
            <option value="all">All purposes</option>
            {purposes.map((purpose) => (
              <option key={purpose.slug} value={purpose.slug}>{purpose.slug}</option>
            ))}
          </select>
          <button className="ghost" onClick={load}>Refresh</button>
        </div>
      </div>
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <section className="card">
        <div className="card-header"><h3>Create agent</h3></div>
        <div className="muted small">New agents are enabled by default. Use Agent detail to modify existing agents.</div>
        <div className="form-grid">
          <label>
            Name
            <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Xyn Default Assistant" />
          </label>
          <label>
            Slug
            <input className="input" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="default-assistant" />
          </label>
          <label>
            Model config
            <select value={form.model_config_id} onChange={(event) => setForm({ ...form, model_config_id: event.target.value })}>
              {modelConfigs.map((item) => (
                <option key={item.id} value={item.id}>{item.provider}:{item.model_name}</option>
              ))}
            </select>
          </label>
          <label>
            Purposes (multi-select)
            <select
              multiple
              className="input"
              value={form.purposes}
              onChange={(event) => setForm({ ...form, purposes: Array.from(event.target.selectedOptions).map((option) => option.value) })}
            >
              {purposes.map((purpose) => (
                <option key={purpose.slug} value={purpose.slug}>{purpose.slug}</option>
              ))}
            </select>
          </label>
          <label>
            System prompt
            <textarea className="input" rows={6} value={form.system_prompt_text} onChange={(event) => setForm({ ...form, system_prompt_text: event.target.value })} />
          </label>
        </div>
        <div className="inline-actions" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <button className="primary" onClick={create} disabled={!form.slug.trim() || !form.name.trim() || !form.model_config_id}>Create</button>
        </div>
      </section>

      <div className="layout">
        <section className="card">
          <div className="card-header"><h3>Agents</h3></div>
          <div className="instance-list">
            {items.map((item) => (
              <button
                type="button"
                className={`instance-row ${selectedAgentId === item.id ? "selected" : ""}`}
                key={item.id}
                onClick={() => {
                  setSelectedAgentId(item.id);
                  setEditForm(toAgentForm(item));
                }}
              >
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted small">{item.slug} · {item.model_config?.provider}:{item.model_config?.model_name} · {item.purposes.join(", ") || "no purposes"}{item.is_default ? " · default" : ""}</span>
                </div>
                <span className="muted">{item.enabled ? "enabled" : "disabled"}</span>
              </button>
            ))}
            {!items.length && <p className="muted">No agents configured.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header"><h3>Agent detail</h3></div>
          {!selectedAgent || !editForm ? (
            <p className="muted">Select an agent to view and edit details.</p>
          ) : (
            <>
              <div className="form-grid">
                <label>
                  Slug
                  <input className="input" value={editForm.slug} disabled />
                </label>
                <label>
                  Name
                  <input className="input" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
                </label>
                <label>
                  Model config
                  <select value={editForm.model_config_id} onChange={(event) => setEditForm({ ...editForm, model_config_id: event.target.value })}>
                    {modelConfigs.map((item) => (
                      <option key={item.id} value={item.id}>{item.provider}:{item.model_name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Purposes (multi-select)
                  <select
                    multiple
                    className="input"
                    value={editForm.purposes}
                    onChange={(event) => setEditForm({ ...editForm, purposes: Array.from(event.target.selectedOptions).map((option) => option.value) })}
                  >
                    {purposes.map((purpose) => (
                      <option key={purpose.slug} value={purpose.slug}>{purpose.slug}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Enabled
                  <select value={editForm.enabled ? "yes" : "no"} onChange={(event) => setEditForm({ ...editForm, enabled: event.target.value === "yes" })}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label>
                  Default agent
                  <select value={editForm.is_default ? "yes" : "no"} onChange={(event) => setEditForm({ ...editForm, is_default: event.target.value === "yes" })}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label>
                  System prompt
                  <textarea className="input" rows={14} value={editForm.system_prompt_text} onChange={(event) => setEditForm({ ...editForm, system_prompt_text: event.target.value })} />
                </label>
              </div>
              <div className="inline-actions" style={{ marginTop: 12 }}>
                <button className="primary" onClick={saveEdit} disabled={!editForm.name.trim() || !editForm.model_config_id}>Save changes</button>
                <button className="danger" onClick={() => remove(selectedAgent)}>Delete agent</button>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
