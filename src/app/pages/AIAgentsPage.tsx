import { useEffect, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import type { AiAgent, AiModelConfig, AiPurpose } from "../../api/types";
import { createAiAgent, deleteAiAgent, listAiAgents, listAiModelConfigs, listAiPurposes, updateAiAgent } from "../../api/xyn";

export default function AIAgentsPage() {
  const [purposes, setPurposes] = useState<AiPurpose[]>([]);
  const [modelConfigs, setModelConfigs] = useState<AiModelConfig[]>([]);
  const [items, setItems] = useState<AiAgent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterPurpose, setFilterPurpose] = useState("all");
  const [form, setForm] = useState({
    slug: "",
    name: "",
    model_config_id: "",
    system_prompt_text: "",
    purposes: ["documentation"] as string[],
  });

  const load = async () => {
    try {
      setError(null);
      const [purposeData, modelData, agentData] = await Promise.all([
        listAiPurposes(),
        listAiModelConfigs(),
        listAiAgents(filterPurpose !== "all" ? { purpose: filterPurpose } : undefined),
      ]);
      setPurposes(purposeData.purposes || []);
      setModelConfigs((modelData.model_configs || []).filter((item) => item.enabled));
      setItems(agentData.agents || []);
      if (!form.model_config_id && modelData.model_configs?.[0]?.id) {
        setForm((prev) => ({ ...prev, model_config_id: modelData.model_configs?.[0]?.id || "" }));
      }
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
      await createAiAgent({
        slug: form.slug,
        name: form.name,
        model_config_id: form.model_config_id,
        system_prompt_text: form.system_prompt_text,
        enabled: true,
        purposes: form.purposes,
      });
      setForm({ ...form, slug: "", name: "", system_prompt_text: "" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleEnabled = async (item: AiAgent) => {
    try {
      await updateAiAgent(item.id, { enabled: !item.enabled });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const remove = async (item: AiAgent) => {
    if (!window.confirm(`Delete agent '${item.name}'?`)) return;
    try {
      await deleteAiAgent(item.id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const setDefault = async (item: AiAgent) => {
    try {
      await updateAiAgent(item.id, { is_default: true });
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

      <section className="card">
        <div className="card-header"><h3>Create agent</h3></div>
        <div className="muted small">New agents are enabled by default. Use the row actions below to disable/re-enable.</div>
        <div className="form-grid">
          <label>
            Name
            <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Documentation Assistant" />
          </label>
          <label>
            Slug
            <input className="input" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="docs-default" />
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
              onChange={(event) => {
                const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                setForm({ ...form, purposes: selected });
              }}
            >
              {purposes.map((purpose) => (
                <option key={purpose.slug} value={purpose.slug}>
                  {purpose.slug}
                </option>
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

      <section className="card">
        <div className="card-header"><h3>Agents</h3></div>
        <div className="instance-list">
          {items.map((item) => (
            <div className="instance-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span className="muted small">{item.slug} · {item.model_config?.provider}:{item.model_config?.model_name} · {item.purposes.join(", ") || "no purposes"}{item.is_default ? " · default" : ""}</span>
              </div>
              <div className="inline-actions">
                <button className="ghost" onClick={() => toggleEnabled(item)}>{item.enabled ? "Disable" : "Enable"}</button>
                <button className="ghost" onClick={() => setDefault(item)}>Set default</button>
                <button className="danger" onClick={() => remove(item)}>Delete</button>
              </div>
            </div>
          ))}
          {!items.length && <p className="muted">No agents configured.</p>}
        </div>
      </section>
    </>
  );
}
