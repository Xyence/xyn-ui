import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import {
  createBlueprint,
  deleteBlueprint,
  getBlueprint,
  listBlueprintDevTasks,
  listBlueprints,
  runDevTask,
  submitBlueprint,
  submitBlueprintWithDevTasks,
  updateBlueprint,
  listReleaseTargets,
  createReleaseTarget,
  deleteReleaseTarget,
} from "../../api/xyn";
import type {
  BlueprintCreatePayload,
  BlueprintDetail,
  BlueprintIntent,
  BlueprintSummary,
  DevTaskSummary,
  ReleaseTarget,
} from "../../api/types";
import { extractBlueprintIntent } from "./blueprintIntent";

const emptyForm: BlueprintCreatePayload = {
  name: "",
  namespace: "core",
  description: "",
  spec_text: "",
  metadata_json: null,
};

export default function BlueprintsPage() {
  const [items, setItems] = useState<BlueprintSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<BlueprintDetail | null>(null);
  const [form, setForm] = useState<BlueprintCreatePayload>(emptyForm);
  const [metadataText, setMetadataText] = useState<string>("");
  const [devTasks, setDevTasks] = useState<DevTaskSummary[]>([]);
  const [devTaskPage, setDevTaskPage] = useState(1);
  const [releaseTargets, setReleaseTargets] = useState<ReleaseTarget[]>([]);
  const [releaseTargetForm, setReleaseTargetForm] = useState({
    name: "",
    environment: "",
    fqdn: "",
    target_instance_id: "",
    zone_name: "",
    zone_id: "",
    tls_mode: "none",
    acme_email: "",
    secret_refs_text: "",
    runtime_mode: "compose_build",
    ingress_network: "xyn-edge",
    ingress_service: "ems-web",
    ingress_port: "3000",
  });
  const [selectedReleaseTargetId, setSelectedReleaseTargetId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const devTasksPageSize = 8;
  const devTaskTotalPages = Math.max(1, Math.ceil(devTasks.length / devTasksPageSize));
  const pagedDevTasks = useMemo(() => {
    const start = (devTaskPage - 1) * devTasksPageSize;
    return devTasks.slice(start, start + devTasksPageSize);
  }, [devTasks, devTaskPage]);
  const intent = useMemo<BlueprintIntent | null>(() => extractBlueprintIntent(selected), [selected]);

  const handleCreateReleaseTarget = async () => {
    if (!selected) return;
    setError(null);
    try {
      let secretRefs: Array<{ name: string; ref: string; type?: string; version?: string }> = [];
      if (releaseTargetForm.secret_refs_text.trim()) {
        secretRefs = JSON.parse(releaseTargetForm.secret_refs_text);
        if (!Array.isArray(secretRefs)) {
          throw new Error("Secret refs must be a JSON array.");
        }
      }
      await createReleaseTarget({
        blueprint_id: selected.id,
        name: releaseTargetForm.name,
        environment: releaseTargetForm.environment || undefined,
        fqdn: releaseTargetForm.fqdn,
        target_instance_id: releaseTargetForm.target_instance_id,
        dns: {
          provider: "route53",
          zone_name: releaseTargetForm.zone_name || undefined,
          zone_id: releaseTargetForm.zone_id || undefined,
          record_type: "A",
          ttl: 60,
        },
        runtime: {
          type: "docker-compose",
          transport: "ssm",
          compose_file_path: "compose.release.yml",
          remote_root: "/opt/xyn/apps/ems",
          mode: releaseTargetForm.runtime_mode,
        },
        tls: {
          mode: releaseTargetForm.tls_mode,
          provider: releaseTargetForm.tls_mode === "host-ingress" ? "traefik" : undefined,
          termination: releaseTargetForm.tls_mode === "host-ingress" ? "host" : undefined,
          acme_email: releaseTargetForm.acme_email || undefined,
          expose_http: true,
          expose_https: true,
          redirect_http_to_https: true,
        },
        ingress:
          releaseTargetForm.tls_mode === "host-ingress"
            ? {
                network: releaseTargetForm.ingress_network || "xyn-edge",
                routes: [
                  {
                    host: releaseTargetForm.fqdn,
                    service: releaseTargetForm.ingress_service || "ems-web",
                    port: Number.parseInt(releaseTargetForm.ingress_port || "3000", 10) || 3000,
                    protocol: "http",
                    health_path: "/health",
                  },
                ],
              }
            : undefined,
        secret_refs: secretRefs,
      });
      const targets = await listReleaseTargets(selected.id);
      setReleaseTargets(targets.release_targets);
      if (!selectedReleaseTargetId && targets.release_targets[0]) {
        setSelectedReleaseTargetId(targets.release_targets[0].id);
      }
      setReleaseTargetForm({
        name: "",
        environment: "",
        fqdn: "",
        target_instance_id: "",
        zone_name: "",
        zone_id: "",
        tls_mode: "none",
        acme_email: "",
        secret_refs_text: "",
        runtime_mode: "compose_build",
        ingress_network: "xyn-edge",
        ingress_service: "ems-web",
        ingress_port: "3000",
      });
      setMessage("Release target created.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteReleaseTarget = async (id: string) => {
    if (!selected) return;
    if (!confirm("Delete this release target?")) return;
    setError(null);
    try {
      await deleteReleaseTarget(id);
      const targets = await listReleaseTargets(selected.id);
      setReleaseTargets(targets.release_targets);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSetDefaultReleaseTarget = async (id: string) => {
    if (!selected) return;
    setError(null);
    try {
      const nextMetadata = {
        ...(selected.metadata_json || {}),
        default_release_target_id: id,
      };
      await updateBlueprint(selected.id, {
        name: selected.name,
        namespace: selected.namespace,
        description: selected.description ?? "",
        spec_text: selected.spec_text ?? "",
        metadata_json: nextMetadata,
      });
      const detail = await getBlueprint(selected.id);
      setSelected(detail);
      setMetadataText(detail.metadata_json ? JSON.stringify(detail.metadata_json, null, 2) : "");
      setMessage("Default release target updated.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

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
          spec_text: detail.spec_text ?? "",
          metadata_json: detail.metadata_json ?? null,
        });
        setMetadataText(detail.metadata_json ? JSON.stringify(detail.metadata_json, null, 2) : "");
        const tasks = await listBlueprintDevTasks(selectedId);
        setDevTasks(tasks.dev_tasks);
        setDevTaskPage(1);
        const targets = await listReleaseTargets(selectedId);
        setReleaseTargets(targets.release_targets);
        const defaultTargetId =
          (detail.metadata_json as Record<string, string> | null)?.default_release_target_id ?? "";
        const targetId = defaultTargetId || targets.release_targets[0]?.id || "";
        setSelectedReleaseTargetId(targetId);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedId]);

  useEffect(() => {
    if (devTaskPage > devTaskTotalPages) {
      setDevTaskPage(devTaskTotalPages);
    }
  }, [devTaskPage, devTaskTotalPages]);

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const payload = { ...form };
      if (metadataText.trim().length > 0) {
        payload.metadata_json = JSON.parse(metadataText);
      } else {
        payload.metadata_json = null;
      }
      await createBlueprint(payload);
      setForm(emptyForm);
      setMetadataText("");
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
      const payload = { ...form };
      if (metadataText.trim().length > 0) {
        payload.metadata_json = JSON.parse(metadataText);
      } else {
        payload.metadata_json = null;
      }
      await updateBlueprint(selectedId, payload);
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
    if (!selectedId || !selected) return;
    const targetFqn = `${selected.namespace}.${selected.name}`;
    if (!confirm(`Submit blueprint ${targetFqn}?`)) return;
    try {
      setLoading(true);
      setError(null);
      const result = await submitBlueprint(selectedId, selectedReleaseTargetId || undefined);
      setMessage(`Submit queued for ${targetFqn}. Run: ${result.run_id ?? "n/a"}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleQueueDevTasks = async () => {
    if (!selectedId || !selected) return;
    const targetFqn = `${selected.namespace}.${selected.name}`;
    if (!confirm(`Submit and queue DevTasks for ${targetFqn}?`)) return;
    try {
      setLoading(true);
      setError(null);
      const result = await submitBlueprintWithDevTasks(selectedId, selectedReleaseTargetId || undefined);
      setMessage(`Dev tasks queued for ${targetFqn}. Run: ${result.run_id ?? "n/a"}`);
      const tasks = await listBlueprintDevTasks(selectedId);
      setDevTasks(tasks.dev_tasks);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunDevTask = async (taskId: string) => {
    try {
      setLoading(true);
      setError(null);
      await runDevTask(taskId);
      const tasks = await listBlueprintDevTasks(selectedId ?? "");
      setDevTasks(tasks.dev_tasks);
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
        <div className="inline-actions">
          <Link className="ghost" to="/app/drafts">
            Start drafting
          </Link>
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
            <h3>Blueprints</h3>
          </div>
          <div className="instance-list">
            {items.map((item) => {
              const projectKey = `${item.namespace}.${item.name}`;
              const draftCount = item.active_draft_count ?? 0;
              return (
                <div
                  key={item.id}
                  className={`instance-row ${selectedId === item.id ? "active" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(item.id);
                    }
                  }}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <span className="muted small">{item.namespace}</span>
                    <span className="muted small">Rev {item.latest_revision ?? "—"}</span>
                  </div>
                  <div className="inline-actions">
                    <Link
                      className="status-pill status-info"
                      to={`/app/drafts?project_key=${encodeURIComponent(projectKey)}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Drafts {draftCount}
                    </Link>
                  </div>
                </div>
              );
            })}
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
              <input value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              Namespace
              <input
                value={form.namespace ?? ""}
                onChange={(event) => setForm({ ...form, namespace: event.target.value })}
              />
            </label>
            <label className="span-full">
              Description
              <input
                value={form.description ?? ""}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <label>
              Blueprint specification
              <textarea
                rows={10}
                value={form.spec_text ?? ""}
                onChange={(event) => setForm({ ...form, spec_text: event.target.value })}
              />
            </label>
              <label>
                Blueprint metadata (JSON)
                <textarea
                rows={10}
                value={metadataText}
                onChange={(event) => setMetadataText(event.target.value)}
                placeholder='{"product":"EMS"}'
                />
              </label>
            </div>
          <div className="card-subsection">
            <h4>Intent</h4>
            {intent ? (
              <div className="stack">
                <div>
                  <div className="label">Requirements summary</div>
                  <p className="muted">{intent.requirements.summary || "No summary available."}</p>
                </div>
                <div>
                  <div className="label">Functional requirements</div>
                  <ul className="intent-list">
                    {(intent.requirements.functional || []).map((entry, index) => (
                      <li key={`functional-${index}`}>{entry}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="label">UI requirements</div>
                  <ul className="intent-list">
                    {(intent.requirements.ui || []).map((entry, index) => (
                      <li key={`ui-${index}`}>{entry}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="label">Data model</div>
                  <ul className="intent-list">
                    {(intent.requirements.dataModel || []).map((entry, index) => (
                      <li key={`data-${index}`}>{entry}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="label">Operational requirements</div>
                  <ul className="intent-list">
                    {(intent.requirements.operational || []).map((entry, index) => (
                      <li key={`ops-${index}`}>{entry}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="label">Definition of done</div>
                  <ul className="intent-list">
                    {(intent.requirements.definitionOfDone || []).map((entry, index) => (
                      <li key={`dod-${index}`}>{entry}</li>
                    ))}
                  </ul>
                </div>
                <details className="intent-prompt">
                  <summary>Original prompt</summary>
                  <pre className="draft-output-pre">{intent.prompt.text}</pre>
                </details>
                {intent.transcripts && intent.transcripts.length > 0 && (
                  <div>
                    <div className="label">Transcripts</div>
                    <div className="stack">
                      {intent.transcripts.map((transcript) => (
                        <details key={transcript.id} className="intent-prompt">
                          <summary>{transcript.id}</summary>
                          {transcript.ref && <p className="muted small">{transcript.ref}</p>}
                          {transcript.text && <pre className="draft-output-pre">{transcript.text}</pre>}
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="muted">No intent metadata stored for this blueprint (created before provenance tracking).</p>
            )}
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
                <button className="ghost" onClick={handleQueueDevTasks} disabled={loading}>
                  Submit &amp; Queue DevTasks
                </button>
                <button className="danger" onClick={handleDelete} disabled={loading}>
                  Delete
                </button>
              </>
            )}
          </div>
          {selected && (
            <div className="form-grid">
              <label className="span-full">
                Release target for submit
                <select value={selectedReleaseTargetId} onChange={(event) => setSelectedReleaseTargetId(event.target.value)}>
                  <option value="">Auto-select</option>
                  {releaseTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name} — {target.fqdn}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </section>

        {selected && (
          <section className="card">
            <div className="card-header">
              <h3>Release Targets</h3>
            </div>
            {releaseTargets.length === 0 ? (
              <p className="muted">No release targets yet.</p>
            ) : (
              <div className="stack">
                {releaseTargets.map((target) => (
                  <div key={target.id} className="item-row">
                    <div>
                      <strong>{target.name}</strong>
                      <span className="muted small">{target.fqdn}</span>
                    </div>
                    <div className="inline-actions">
                      <span className="muted small">{target.tls?.mode ?? "none"}</span>
                      <button className="ghost small" onClick={() => handleSetDefaultReleaseTarget(target.id)} disabled={loading}>
                        Set default
                      </button>
                      <button className="ghost small" onClick={() => handleDeleteReleaseTarget(target.id)} disabled={loading}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="form-grid">
              <label>
                Name
                <input value={releaseTargetForm.name} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, name: event.target.value })} />
              </label>
              <label>
                Environment
                <input value={releaseTargetForm.environment} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, environment: event.target.value })} />
              </label>
              <label className="span-full">
                FQDN
                <input value={releaseTargetForm.fqdn} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, fqdn: event.target.value })} />
              </label>
              <label>
                Target instance ID
                <input value={releaseTargetForm.target_instance_id} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, target_instance_id: event.target.value })} />
              </label>
              <label>
                DNS zone name
                <input value={releaseTargetForm.zone_name} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, zone_name: event.target.value })} />
              </label>
              <label>
                DNS zone id
                <input value={releaseTargetForm.zone_id} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, zone_id: event.target.value })} />
              </label>
              <label>
                Runtime mode
                <select value={releaseTargetForm.runtime_mode} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, runtime_mode: event.target.value })}>
                  <option value="compose_build">compose_build</option>
                  <option value="compose_images">compose_images</option>
                </select>
              </label>
              <label>
                TLS mode
                <select value={releaseTargetForm.tls_mode} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, tls_mode: event.target.value })}>
                  <option value="none">none</option>
                  <option value="nginx+acme">nginx+acme</option>
                  <option value="host-ingress">host-ingress</option>
                  <option value="embedded">embedded</option>
                </select>
              </label>
              <label>
                Ingress network
                <input value={releaseTargetForm.ingress_network} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, ingress_network: event.target.value })} />
              </label>
              <label>
                Ingress service
                <input value={releaseTargetForm.ingress_service} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, ingress_service: event.target.value })} />
              </label>
              <label>
                Ingress port
                <input value={releaseTargetForm.ingress_port} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, ingress_port: event.target.value })} />
              </label>
              <label>
                ACME email
                <input value={releaseTargetForm.acme_email} onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, acme_email: event.target.value })} />
              </label>
              <label className="span-full">
                Secret refs (JSON array)
                <textarea
                  rows={4}
                  placeholder='[{"name":"EMS_JWT_SECRET","ref":"ssm:/xyn/ems/manager-demo/jwt_secret"}]'
                  value={releaseTargetForm.secret_refs_text}
                  onChange={(event) => setReleaseTargetForm({ ...releaseTargetForm, secret_refs_text: event.target.value })}
                />
              </label>
            </div>
            <div className="form-actions">
              <button className="primary" onClick={handleCreateReleaseTarget} disabled={loading}>
                Add release target
              </button>
            </div>
          </section>
        )}

        {selected && (
          <section className="card">
            <div className="card-header">
              <h3>Dev Tasks</h3>
              {devTasks.length > 0 && (
                <div className="inline-actions">
                  <button className="ghost small" onClick={() => setDevTaskPage((prev) => Math.max(1, prev - 1))} disabled={devTaskPage <= 1}>
                    Prev
                  </button>
                  <span className="muted small">
                    Page {devTaskPage} / {devTaskTotalPages}
                  </span>
                  <button className="ghost small" onClick={() => setDevTaskPage((prev) => Math.min(devTaskTotalPages, prev + 1))} disabled={devTaskPage >= devTaskTotalPages}>
                    Next
                  </button>
                </div>
              )}
            </div>
            {devTasks.length === 0 ? (
              <p className="muted">No dev tasks yet.</p>
            ) : (
              <div className="stack">
                {pagedDevTasks.map((task) => (
                  <div key={task.id} className="item-row">
                    <div>
                      <strong>{task.title}</strong>
                      <span className="muted small">{task.task_type}</span>
                    </div>
                    <div className="inline-actions">
                      {task.result_run && (
                        <a className="link small" href={`/app/runs?run=${task.result_run}`}>
                          Run
                        </a>
                      )}
                      <button className="ghost small" onClick={() => handleRunDevTask(task.id)} disabled={loading}>
                        Run task
                      </button>
                      <span className="muted small">{task.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
