import { useEffect, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import type { AiCredential, AiModelConfig, AiModelConfigCompat, AiPurpose } from "../../api/types";
import { createAiModelConfig, deleteAiModelConfig, getAiModelConfigCompat, listAiCredentials, listAiModelConfigs, listAiProviders, listAiPurposes, updateAiModelConfig } from "../../api/xyn";

function isOpenAIGpt5Model(provider: string, modelName: string): boolean {
  return provider === "openai" && /^gpt-5($|-)/i.test((modelName || "").trim());
}

export default function AIModelConfigsPage() {
  const [providers, setProviders] = useState<Array<{ slug: "openai" | "anthropic" | "google"; name: string }>>([]);
  const [credentials, setCredentials] = useState<AiCredential[]>([]);
  const [items, setItems] = useState<AiModelConfig[]>([]);
  const [compatByModelConfigId, setCompatByModelConfigId] = useState<Record<string, AiModelConfigCompat>>({});
  const [purposes, setPurposes] = useState<AiPurpose[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    provider: "openai" as "openai" | "anthropic" | "google",
    credential_id: "",
    model_name: "",
    temperature: "0.2",
    max_tokens: "1200",
  });

  const load = async () => {
    try {
      setError(null);
      const [providerData, credentialData, modelData, purposeData] = await Promise.all([
        listAiProviders(),
        listAiCredentials(),
        listAiModelConfigs(),
        listAiPurposes(),
      ]);
      setProviders(providerData.providers.map((item) => ({ slug: item.slug, name: item.name })));
      setCredentials(credentialData.credentials || []);
      const nextItems = modelData.model_configs || [];
      setItems(nextItems);
      setPurposes(purposeData.purposes || []);
      const compatPairs = await Promise.all(
        nextItems.map(async (item) => {
          try {
            const compat = await getAiModelConfigCompat(item.id);
            return [item.id, compat] as const;
          } catch {
            return [item.id, { provider: item.provider, model_name: item.model_name, effective_params: {}, warnings: [] } as AiModelConfigCompat] as const;
          }
        })
      );
      setCompatByModelConfigId(Object.fromEntries(compatPairs));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      setError(null);
      await createAiModelConfig({
        provider: form.provider,
        credential_id: form.credential_id || undefined,
        model_name: form.model_name,
        temperature: Number(form.temperature),
        max_tokens: Number(form.max_tokens),
        enabled: true,
      });
      setForm({ ...form, model_name: "" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleEnabled = async (item: AiModelConfig) => {
    try {
      await updateAiModelConfig(item.id, { enabled: !item.enabled });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const remove = async (item: AiModelConfig) => {
    if (!window.confirm(`Delete model config '${item.model_name}'?`)) return;
    try {
      await deleteAiModelConfig(item.id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const providerCredentials = credentials.filter((item) => item.provider === form.provider);
  const createFormTemperatureIgnored = isOpenAIGpt5Model(form.provider, form.model_name);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>AI Model Configs</h2>
          <p className="muted">Provider/model parameters with optional credential binding.</p>
        </div>
        <div className="inline-actions"><button className="ghost" onClick={load}>Refresh</button></div>
      </div>
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}

      <section className="card">
        <div className="card-header"><h3>Create model config</h3></div>
        <div className="muted small">New model configs are enabled by default. Use the row actions below to disable/re-enable.</div>
        <div className="form-grid">
          <label>
            Provider
            <select value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value as "openai" | "anthropic" | "google", credential_id: "" })}>
              {(providers.length ? providers : [{ slug: "openai", name: "OpenAI" }, { slug: "anthropic", name: "Anthropic" }, { slug: "google", name: "Google" }]).map((provider) => (
                <option key={provider.slug} value={provider.slug}>{provider.name}</option>
              ))}
            </select>
          </label>
          <label>
            Credential (optional)
            <select value={form.credential_id} onChange={(event) => setForm({ ...form, credential_id: event.target.value })}>
              <option value="">None (env fallback)</option>
              {providerCredentials.map((credential) => (
                <option key={credential.id} value={credential.id}>{credential.name}</option>
              ))}
            </select>
          </label>
          <label>
            Model name
            <input className="input" value={form.model_name} onChange={(event) => setForm({ ...form, model_name: event.target.value })} placeholder="gpt-4o-mini" />
          </label>
          <label>
            Temperature
            <input className="input" value={form.temperature} onChange={(event) => setForm({ ...form, temperature: event.target.value })} />
            {createFormTemperatureIgnored && (
              <span className="muted small">This model does not support temperature; it will be ignored during invocation.</span>
            )}
          </label>
          <label>
            Max tokens
            <input className="input" value={form.max_tokens} onChange={(event) => setForm({ ...form, max_tokens: event.target.value })} />
          </label>
        </div>
        <div className="inline-actions" style={{ marginTop: 12 }}>
          <button className="primary" onClick={create} disabled={!form.model_name.trim()}>Create</button>
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h3>Model configs</h3></div>
        <div className="instance-list">
          {items.map((item) => (
            <div className="instance-row" key={item.id}>
              <div>
                <strong>{item.model_name}</strong>
                <span className="muted small">
                  {item.provider} · temp {item.temperature ?? "-"} · max {item.max_tokens ?? "-"} · purposes:{" "}
                  {purposes
                    .filter((purpose) => purpose.model_config?.id === item.id)
                    .map((purpose) => purpose.slug)
                    .join(", ") || "none"}
                  {compatByModelConfigId[item.id]?.warnings?.some((warning) => warning.param === "temperature") && (
                    <> · temperature ignored for this model</>
                  )}
                </span>
              </div>
              <div className="inline-actions">
                <button className="ghost" onClick={() => toggleEnabled(item)}>{item.enabled ? "Disable" : "Enable"}</button>
                <button className="danger" onClick={() => remove(item)}>Delete</button>
              </div>
            </div>
          ))}
          {!items.length && <p className="muted">No model configs configured.</p>}
        </div>
      </section>
    </>
  );
}
