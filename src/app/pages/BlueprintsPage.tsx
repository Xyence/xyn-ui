import { useCallback, useEffect, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import {
  createBlueprint,
  deleteBlueprint,
  getBlueprint,
  listBlueprintDraftSessions,
  listBlueprintVoiceNotes,
  listBlueprints,
  listBlueprintDevTasks,
  listContextPacks,
  getDraftSession,
  enqueueDraftGeneration,
  enqueueDraftRevision,
  resolveDraftSessionContext,
  saveDraftSession,
  publishDraftSession,
  runDevTask,
  createBlueprintDraftSession,
  uploadVoiceNote,
  enqueueVoiceNoteTranscription,
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
  BlueprintDraftSession,
  BlueprintDraftSessionDetail,
  BlueprintSummary,
  BlueprintVoiceNote,
  ContextPackSummary,
  DevTaskSummary,
  ReleaseTarget,
} from "../../api/types";

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
  const [voiceNotes, setVoiceNotes] = useState<BlueprintVoiceNote[]>([]);
  const [draftSessions, setDraftSessions] = useState<BlueprintDraftSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<BlueprintDraftSessionDetail | null>(null);
  const [draftJsonText, setDraftJsonText] = useState<string>("");
  const [revisionInstruction, setRevisionInstruction] = useState<string>("");
  const [sessionContextPackIds, setSessionContextPackIds] = useState<string[]>([]);
  const [contextPacks, setContextPacks] = useState<ContextPackSummary[]>([]);
  const [selectedContextPackIds, setSelectedContextPackIds] = useState<string[]>([]);
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
  const [uploading, setUploading] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    (async () => {
      try {
        const packs = await listContextPacks({ active: true });
        setContextPacks(packs.context_packs);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, []);

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
        const sessions = await listBlueprintDraftSessions(selectedId);
        setDraftSessions(sessions.sessions);
        const notes = await listBlueprintVoiceNotes(selectedId);
        setVoiceNotes(notes.voice_notes);
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
    if (!selectedSessionId && draftSessions.length > 0) {
      setSelectedSessionId(draftSessions[0].id);
    }
  }, [draftSessions, selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSession(null);
      setDraftJsonText("");
      setRevisionInstruction("");
      setSessionContextPackIds([]);
      return;
    }
    (async () => {
      try {
        const detail = await getDraftSession(selectedSessionId);
        setSelectedSession(detail);
        setDraftJsonText(detail.draft ? JSON.stringify(detail.draft, null, 2) : "");
        setSessionContextPackIds(detail.context_pack_ids ?? []);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedSessionId]);

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
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await submitBlueprint(selectedId, selectedReleaseTargetId || undefined);
      setMessage(`Submit queued. Run: ${result.run_id ?? "n/a"}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleQueueDevTasks = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await submitBlueprintWithDevTasks(selectedId, selectedReleaseTargetId || undefined);
      setMessage(`Dev tasks queued. Run: ${result.run_id ?? "n/a"}`);
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

  const refreshVoiceNotes = async () => {
    if (!selectedId) return;
    try {
      const sessions = await listBlueprintDraftSessions(selectedId);
      setDraftSessions(sessions.sessions);
      const notes = await listBlueprintVoiceNotes(selectedId);
      setVoiceNotes(notes.voice_notes);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const ensureDraftSession = async () => {
    if (!selectedId) return null;
    if (selectedSessionId) {
      return selectedSessionId;
    }
    if (draftSessions.length > 0) {
      return draftSessions[0].id;
    }
    const created = await createBlueprintDraftSession(selectedId, {
      blueprint_kind: "solution",
      context_pack_ids: selectedContextPackIds,
    });
    await refreshVoiceNotes();
    setSelectedSessionId(created.session_id);
    return created.session_id;
  };

  const handleCreateSession = async () => {
    if (!selectedId) return;
    try {
      setCreatingSession(true);
      setError(null);
      const created = await createBlueprintDraftSession(selectedId, {
        blueprint_kind: "solution",
        context_pack_ids: selectedContextPackIds,
      });
      await refreshVoiceNotes();
      setSelectedSessionId(created.session_id);
      setMessage(`Draft session created: ${created.session_id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleVoiceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !selectedId) return;
    try {
      setUploading(true);
      setError(null);
      const file = event.target.files[0];
      const sessionId = await ensureDraftSession();
      if (!sessionId) {
        setError("No draft session available.");
        return;
      }
      const uploaded = await uploadVoiceNote(file, { session_id: sessionId, language_code: "en-US" });
      await enqueueVoiceNoteTranscription(uploaded.voice_note_id);
      await refreshVoiceNotes();
      setMessage("Recording uploaded and queued for transcription.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleContextPackSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const ids = Array.from(event.target.selectedOptions).map((opt) => opt.value);
    setSelectedContextPackIds(ids);
  };

  const handleSessionContextPackSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const ids = Array.from(event.target.selectedOptions).map((opt) => opt.value);
    setSessionContextPackIds(ids);
  };

  const refreshSelectedSession = async () => {
    if (!selectedSessionId) return;
    try {
      const detail = await getDraftSession(selectedSessionId);
      setSelectedSession(detail);
      setDraftJsonText(detail.draft ? JSON.stringify(detail.draft, null, 2) : "");
      setSessionContextPackIds(detail.context_pack_ids ?? []);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedSessionId) return;
    try {
      setLoading(true);
      setError(null);
      await enqueueDraftGeneration(selectedSessionId);
      setMessage("Draft generation queued.");
      await refreshSelectedSession();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReviseDraft = async () => {
    if (!selectedSessionId) return;
    try {
      setLoading(true);
      setError(null);
      await enqueueDraftRevision(selectedSessionId, { instruction: revisionInstruction });
      setMessage("Draft revision queued.");
      setRevisionInstruction("");
      await refreshSelectedSession();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveContext = async () => {
    if (!selectedSessionId) return;
    try {
      setLoading(true);
      setError(null);
      await resolveDraftSessionContext(selectedSessionId, { context_pack_ids: sessionContextPackIds });
      setMessage("Context resolved.");
      await refreshSelectedSession();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedSessionId) return;
    try {
      setLoading(true);
      setError(null);
      const parsed = draftJsonText.trim().length > 0 ? JSON.parse(draftJsonText) : {};
      await saveDraftSession(selectedSessionId, { draft_json: parsed });
      setMessage("Draft saved.");
      await refreshSelectedSession();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishDraft = async () => {
    if (!selectedSessionId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await publishDraftSession(selectedSessionId);
      setMessage(`Draft published: ${result.entity_type ?? "entity"} ${result.entity_id ?? ""}`.trim());
      await refreshSelectedSession();
      await load();
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
        <button className="ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <div className="layout">
        <section className="card">
          <div className="card-header">
            <h3>Blueprints</h3>
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
                  <span className="muted small">{item.namespace}</span>
                </div>
                <span className="muted small">Rev {item.latest_revision ?? "—"}</span>
              </button>
            ))}
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
              <input
                value={form.name ?? ""}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
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
                placeholder='{\n  "product": "EMS"\n}'
              />
            </label>
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
                <select
                  value={selectedReleaseTargetId}
                  onChange={(event) => setSelectedReleaseTargetId(event.target.value)}
                >
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
          {selected && (
            <div className="detail-grid">
              <div>
                <div className="label">Updated</div>
                <span className="muted">{selected.updated_at ?? "—"}</span>
              </div>
              <div>
                <div className="label">Created</div>
                <span className="muted">{selected.created_at ?? "—"}</span>
              </div>
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
                      <button
                        className="ghost small"
                        onClick={() => handleSetDefaultReleaseTarget(target.id)}
                        disabled={loading}
                      >
                        Set default
                      </button>
                      <button
                        className="ghost small"
                        onClick={() => handleDeleteReleaseTarget(target.id)}
                        disabled={loading}
                      >
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
                <input
                  value={releaseTargetForm.name}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, name: event.target.value })
                  }
                />
              </label>
              <label>
                Environment
                <input
                  value={releaseTargetForm.environment}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, environment: event.target.value })
                  }
                />
              </label>
              <label className="span-full">
                FQDN
                <input
                  value={releaseTargetForm.fqdn}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, fqdn: event.target.value })
                  }
                />
              </label>
              <label>
                Target instance ID
                <input
                  value={releaseTargetForm.target_instance_id}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, target_instance_id: event.target.value })
                  }
                />
              </label>
              <label>
                DNS zone name
                <input
                  value={releaseTargetForm.zone_name}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, zone_name: event.target.value })
                  }
                />
              </label>
              <label>
                DNS zone id
                <input
                  value={releaseTargetForm.zone_id}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, zone_id: event.target.value })
                  }
                />
              </label>
              <label>
                Runtime mode
                <select
                  value={releaseTargetForm.runtime_mode}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, runtime_mode: event.target.value })
                  }
                >
                  <option value="compose_build">compose_build</option>
                  <option value="compose_images">compose_images</option>
                </select>
              </label>
              <label>
                TLS mode
                <select
                  value={releaseTargetForm.tls_mode}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, tls_mode: event.target.value })
                  }
                >
                  <option value="none">none</option>
                  <option value="nginx+acme">nginx+acme</option>
                  <option value="host-ingress">host-ingress</option>
                  <option value="embedded">embedded</option>
                </select>
              </label>
              <label>
                Ingress network
                <input
                  value={releaseTargetForm.ingress_network}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, ingress_network: event.target.value })
                  }
                />
              </label>
              <label>
                Ingress service
                <input
                  value={releaseTargetForm.ingress_service}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, ingress_service: event.target.value })
                  }
                />
              </label>
              <label>
                Ingress port
                <input
                  value={releaseTargetForm.ingress_port}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, ingress_port: event.target.value })
                  }
                />
              </label>
              <label>
                ACME email
                <input
                  value={releaseTargetForm.acme_email}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, acme_email: event.target.value })
                  }
                />
              </label>
              <label className="span-full">
                Secret refs (JSON array)
                <textarea
                  rows={4}
                  placeholder='[{"name":"EMS_JWT_SECRET","ref":"ssm:/xyn/ems/manager-demo/jwt_secret"}]'
                  value={releaseTargetForm.secret_refs_text}
                  onChange={(event) =>
                    setReleaseTargetForm({ ...releaseTargetForm, secret_refs_text: event.target.value })
                  }
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
            </div>
            {devTasks.length === 0 ? (
              <p className="muted">No dev tasks yet.</p>
            ) : (
              <div className="stack">
                {devTasks.map((task) => (
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
        {selected && (
          <section className="card">
            <div className="card-header">
              <h3>Draft Sessions</h3>
              <div className="inline-actions">
                <button className="ghost" onClick={refreshSelectedSession} disabled={loading || !selectedSessionId}>
                  Refresh
                </button>
                <button className="ghost" onClick={handleCreateSession} disabled={creatingSession || loading}>
                  New draft session
                </button>
              </div>
            </div>
            {draftSessions.length === 0 ? (
              <p className="muted">No draft sessions yet.</p>
            ) : (
              <div className="stack">
                <div className="instance-list">
                  {draftSessions.map((session) => (
                    <button
                      key={session.id}
                      className={`instance-row ${selectedSessionId === session.id ? "active" : ""}`}
                      onClick={() => setSelectedSessionId(session.id)}
                    >
                      <div>
                        <strong>{session.name}</strong>
                        <span className="muted small">{session.blueprint_kind}</span>
                      </div>
                      <span className="muted small">{session.status}</span>
                    </button>
                  ))}
                </div>
                {!selectedSession ? (
                  <p className="muted">Select a draft session to view details.</p>
                ) : (
                  <div className="stack">
                    <div className="detail-grid">
                      <div>
                        <div className="label">Status</div>
                        <span className="muted">{selectedSession.status}</span>
                      </div>
                      <div>
                        <div className="label">Job ID</div>
                        <span className="muted">{selectedSession.job_id ?? "—"}</span>
                      </div>
                      <div>
                        <div className="label">Context Hash</div>
                        <span className="muted">{selectedSession.effective_context_hash ?? "—"}</span>
                      </div>
                      <div>
                        <div className="label">Blueprint Kind</div>
                        <span className="muted">{selectedSession.blueprint_kind}</span>
                      </div>
                    </div>
                    {selectedSession.last_error && (
                      <InlineMessage tone="error" title="Last error" body={selectedSession.last_error} />
                    )}
                    <label>
                      Context packs for session
                      <select
                        multiple
                        size={Math.min(Math.max(contextPacks.length, 3), 8)}
                        value={sessionContextPackIds}
                        onChange={handleSessionContextPackSelect}
                      >
                        {contextPacks.map((pack) => (
                          <option key={pack.id} value={pack.id}>
                            {pack.name} ({pack.scope}) v{pack.version}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="inline-actions">
                      <button className="ghost" onClick={handleResolveContext} disabled={loading}>
                        Resolve context
                      </button>
                      <button className="ghost" onClick={handleGenerateDraft} disabled={loading}>
                        Generate draft
                      </button>
                      <button className="ghost" onClick={handlePublishDraft} disabled={loading}>
                        Publish draft
                      </button>
                    </div>
                    <label>
                      Revision instruction
                      <textarea
                        rows={4}
                        value={revisionInstruction}
                        onChange={(event) => setRevisionInstruction(event.target.value)}
                      />
                    </label>
                    <button className="ghost" onClick={handleReviseDraft} disabled={loading}>
                      Revise draft
                    </button>
                    <label>
                      Draft JSON
                      <textarea
                        rows={12}
                        value={draftJsonText}
                        onChange={(event) => setDraftJsonText(event.target.value)}
                      />
                    </label>
                    <div className="inline-actions">
                      <button className="ghost" onClick={handleSaveDraft} disabled={loading}>
                        Save draft
                      </button>
                    </div>
                    {selectedSession.requirements_summary && (
                      <div className="stack">
                        <strong>Requirements summary</strong>
                        <pre style={{ whiteSpace: "pre-wrap" }}>{selectedSession.requirements_summary}</pre>
                      </div>
                    )}
                    {selectedSession.diff_summary && (
                      <div className="stack">
                        <strong>Diff summary</strong>
                        <pre style={{ whiteSpace: "pre-wrap" }}>{selectedSession.diff_summary}</pre>
                      </div>
                    )}
                    <div className="stack">
                      <strong>Validation errors</strong>
                      {(selectedSession.validation_errors ?? []).length === 0 ? (
                        <span className="muted">No validation errors.</span>
                      ) : (
                        (selectedSession.validation_errors ?? []).map((err) => (
                          <span key={err} className="muted">
                            {err}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="stack">
                      <strong>Effective context preview</strong>
                      <pre style={{ whiteSpace: "pre-wrap" }}>
                        {selectedSession.effective_context_preview ?? "No context preview."}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
        {selected && (
          <section className="card">
            <div className="card-header">
              <h3>Voice recordings</h3>
              <div className="inline-actions">
                <button
                  className="ghost"
                  onClick={handleCreateSession}
                  disabled={creatingSession || loading}
                >
                  New draft session
                </button>
                <button className="ghost" onClick={refreshVoiceNotes} disabled={uploading || loading}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="stack">
              <label>
                Context packs for new draft sessions
                <select
                  multiple
                  size={Math.min(Math.max(contextPacks.length, 3), 8)}
                  value={selectedContextPackIds}
                  onChange={handleContextPackSelect}
                >
                  {contextPacks.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} ({pack.scope}) v{pack.version}
                    </option>
                  ))}
                </select>
              </label>
              {contextPacks.length === 0 && (
                <span className="muted small">No active context packs available.</span>
              )}
              <label className="file-input">
                <input type="file" accept="audio/*" onChange={handleVoiceUpload} disabled={uploading} />
                <span className="button-like">{uploading ? "Uploading..." : "Upload recording"}</span>
              </label>
              {voiceNotes.length === 0 ? (
                <p className="muted">No recordings yet.</p>
              ) : (
                voiceNotes.map((note) => (
                  <div key={note.id} className="item-row">
                    <div>
                      <strong>{note.title || "Recording"}</strong>
                      <span className="muted small">{note.status}</span>
                      {note.transcript_text && <span className="muted small">{note.transcript_text}</span>}
                    </div>
                    <div className="inline-actions">
                      <span className="muted small">{note.created_at ?? "—"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
