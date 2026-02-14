import { useCallback, useEffect, useMemo, useState } from "react";
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
  getContextPackDefaults,
  getDraftSession,
  enqueueDraftGeneration,
  enqueueDraftRevision,
  resolveDraftSessionContext,
  saveDraftSession,
  publishDraftSession,
  submitDraftSession,
  listDraftSessionRevisions,
  updateDraftSession,
  deleteDraftSession,
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
  DraftSessionRevision,
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
  const [devTaskPage, setDevTaskPage] = useState(1);
  const [voiceNotes, setVoiceNotes] = useState<BlueprintVoiceNote[]>([]);
  const [draftSessions, setDraftSessions] = useState<BlueprintDraftSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<BlueprintDraftSessionDetail | null>(null);
  const [sessionRevisions, setSessionRevisions] = useState<DraftSessionRevision[]>([]);
  const [revisionSearch, setRevisionSearch] = useState("");
  const [revisionPage, setRevisionPage] = useState(1);
  const [revisionTotal, setRevisionTotal] = useState(0);
  const [draftJsonText, setDraftJsonText] = useState<string>("");
  const [revisionInstruction, setRevisionInstruction] = useState<string>("");
  const [sessionContextPackIds, setSessionContextPackIds] = useState<string[]>([]);
  const [recommendedSessionPackIds, setRecommendedSessionPackIds] = useState<string[]>([]);
  const [requiredPackNames, setRequiredPackNames] = useState<string[]>([]);
  const [contextPacks, setContextPacks] = useState<ContextPackSummary[]>([]);
  const [selectedContextPackIds, setSelectedContextPackIds] = useState<string[]>([]);
  const [newSessionTitle, setNewSessionTitle] = useState("Untitled draft");
  const [newSessionKind, setNewSessionKind] = useState<"blueprint" | "solution">("blueprint");
  const [newSessionNamespace, setNewSessionNamespace] = useState("");
  const [newSessionProjectKey, setNewSessionProjectKey] = useState("");
  const [newSessionGenerateCode, setNewSessionGenerateCode] = useState(false);
  const [newSessionPrompt, setNewSessionPrompt] = useState("");
  const [newSessionTranscript, setNewSessionTranscript] = useState("");
  const [didManuallyEditNewSessionPacks, setDidManuallyEditNewSessionPacks] = useState(false);
  const [contextPackPurposeFilter, setContextPackPurposeFilter] = useState<"all" | "planner" | "coder">("all");
  const [contextPackScopeFilter, setContextPackScopeFilter] = useState<"all" | "global" | "namespace" | "project">(
    "all"
  );
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
  const revisionPageSize = 5;
  const devTasksPageSize = 8;
  const devTaskTotalPages = Math.max(1, Math.ceil(devTasks.length / devTasksPageSize));
  const revisionTotalPages = Math.max(1, Math.ceil(revisionTotal / revisionPageSize));
  const pagedDevTasks = useMemo(() => {
    const start = (devTaskPage - 1) * devTasksPageSize;
    return devTasks.slice(start, start + devTasksPageSize);
  }, [devTasks, devTaskPage]);
  const filteredContextPacks = useMemo(() => {
    return contextPacks.filter((pack) => {
      if (contextPackPurposeFilter !== "all" && pack.purpose !== contextPackPurposeFilter) {
        return false;
      }
      if (contextPackScopeFilter !== "all" && pack.scope !== contextPackScopeFilter) {
        return false;
      }
      return true;
    });
  }, [contextPackPurposeFilter, contextPackScopeFilter, contextPacks]);

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
        setDevTaskPage(1);
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
    if (!selected) return;
    const projectKey = `${selected.namespace}.${selected.name}`;
    setNewSessionNamespace(selected.namespace ?? "");
    setNewSessionProjectKey(projectKey);
  }, [selected]);

  useEffect(() => {
    if (!selectedSessionId && draftSessions.length > 0) {
      setSelectedSessionId(draftSessions[0].id);
    }
  }, [draftSessions, selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSession(null);
      setSessionRevisions([]);
      setRevisionTotal(0);
      setRevisionPage(1);
      setRevisionSearch("");
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
        setRevisionInstruction(detail.revision_instruction ?? "");
        const ids = detail.selected_context_pack_ids ?? detail.context_pack_ids ?? [];
        setSessionContextPackIds(ids);
        const defaults = await getContextPackDefaults({
          draft_kind: detail.kind === "solution" ? "solution" : "blueprint",
          namespace: detail.namespace ?? undefined,
          project_key: detail.project_key ?? undefined,
          generate_code: detail.kind === "solution",
        });
        setRecommendedSessionPackIds(defaults.recommended_context_pack_ids);
        setRequiredPackNames(defaults.required_pack_names);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedSessionId]);

  useEffect(() => {
    if (devTaskPage > devTaskTotalPages) {
      setDevTaskPage(devTaskTotalPages);
    }
  }, [devTaskPage, devTaskTotalPages]);

  useEffect(() => {
    if (revisionPage > revisionTotalPages) {
      setRevisionPage(revisionTotalPages);
    }
  }, [revisionPage, revisionTotalPages]);

  useEffect(() => {
    if (!selectedSessionId) return;
    refreshSessionRevisions();
  }, [selectedSessionId, revisionPage, revisionSearch]);

  const refreshRecommendedContextPacks = useCallback(
    async (options?: {
      kind?: "blueprint" | "solution";
      namespace?: string;
      projectKey?: string;
      generateCode?: boolean;
      promptOnReset?: boolean;
    }) => {
      const kind = options?.kind ?? newSessionKind;
      const namespace = options?.namespace ?? newSessionNamespace;
      const projectKey = options?.projectKey ?? newSessionProjectKey;
      const generateCode = options?.generateCode ?? newSessionGenerateCode;
      const defaults = await getContextPackDefaults({
        draft_kind: kind,
        namespace: namespace || undefined,
        project_key: projectKey || undefined,
        generate_code: generateCode,
      });
      setRequiredPackNames(defaults.required_pack_names);
      if (!didManuallyEditNewSessionPacks) {
        setSelectedContextPackIds(defaults.recommended_context_pack_ids);
        return;
      }
      if (options?.promptOnReset && defaults.recommended_context_pack_ids.join(",") !== selectedContextPackIds.join(",")) {
        const shouldReset = confirm("Reset context packs to recommended defaults?");
        if (shouldReset) {
          setSelectedContextPackIds(defaults.recommended_context_pack_ids);
          setDidManuallyEditNewSessionPacks(false);
        }
      }
    },
    [
      didManuallyEditNewSessionPacks,
      newSessionGenerateCode,
      newSessionKind,
      newSessionNamespace,
      newSessionProjectKey,
      selectedContextPackIds,
    ]
  );

  useEffect(() => {
    if (contextPacks.length === 0) return;
    refreshRecommendedContextPacks().catch((err) => setError((err as Error).message));
  }, [contextPacks.length, refreshRecommendedContextPacks]);

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
      title: "Untitled draft",
      kind: "blueprint",
      namespace: newSessionNamespace || undefined,
      project_key: newSessionProjectKey || undefined,
      selected_context_pack_ids: selectedContextPackIds,
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
        title: newSessionTitle.trim() || "Untitled draft",
        kind: newSessionKind,
        namespace: newSessionNamespace || undefined,
        project_key: newSessionProjectKey || undefined,
        generate_code: newSessionGenerateCode,
        initial_prompt: newSessionPrompt.trim(),
        selected_context_pack_ids: selectedContextPackIds.length > 0 ? selectedContextPackIds : undefined,
        source_artifacts: newSessionTranscript.trim()
          ? [{ type: "audio_transcript", content: newSessionTranscript.trim() }]
          : undefined,
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
    setDidManuallyEditNewSessionPacks(true);
    setSelectedContextPackIds(ids);
  };

  const handleSessionContextPackSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const ids = Array.from(event.target.selectedOptions).map((opt) => opt.value);
    setSessionContextPackIds(ids);
  };

  async function refreshSessionRevisions() {
    if (!selectedSessionId) return;
    try {
      const payload = await listDraftSessionRevisions(selectedSessionId, {
        q: revisionSearch.trim() || undefined,
        page: revisionPage,
        page_size: revisionPageSize,
      });
      setSessionRevisions(payload.revisions);
      setRevisionTotal(payload.total);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const refreshSelectedSession = async () => {
    if (!selectedSessionId) return;
    try {
      const detail = await getDraftSession(selectedSessionId);
      setSelectedSession(detail);
      setDraftJsonText(detail.draft ? JSON.stringify(detail.draft, null, 2) : "");
      setRevisionInstruction(detail.revision_instruction ?? "");
      const ids = detail.selected_context_pack_ids ?? detail.context_pack_ids ?? [];
      setSessionContextPackIds(ids);
      const defaults = await getContextPackDefaults({
        draft_kind: detail.kind === "solution" ? "solution" : "blueprint",
        namespace: detail.namespace ?? undefined,
        project_key: detail.project_key ?? undefined,
        generate_code: detail.kind === "solution",
      });
      setRecommendedSessionPackIds(defaults.recommended_context_pack_ids);
      setRequiredPackNames(defaults.required_pack_names);
      await refreshSessionRevisions();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedSessionId || !selectedSession) return;
    try {
      setLoading(true);
      setError(null);
      await updateDraftSession(selectedSessionId, {
        title: selectedSession.title || selectedSession.id,
        kind: (selectedSession.kind as "blueprint" | "solution") || "blueprint",
        namespace: selectedSession.namespace || undefined,
        project_key: selectedSession.project_key || undefined,
        initial_prompt: selectedSession.initial_prompt || "",
        selected_context_pack_ids: sessionContextPackIds,
        source_artifacts: selectedSession.source_artifacts,
      });
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
    if (!selectedSession?.has_generated_output) {
      setError("Revision instruction is only available after initial output is generated.");
      return;
    }
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

  const handleUpdateSessionMetadata = async () => {
    if (!selectedSessionId || !selectedSession) return;
    try {
      setLoading(true);
      setError(null);
      await updateDraftSession(selectedSessionId, {
        title: selectedSession.title || selectedSession.id,
        kind: (selectedSession.kind as "blueprint" | "solution") || "blueprint",
        namespace: selectedSession.namespace || undefined,
        project_key: selectedSession.project_key || undefined,
        initial_prompt: selectedSession.initial_prompt || "",
        revision_instruction: revisionInstruction || selectedSession.revision_instruction || "",
        selected_context_pack_ids: sessionContextPackIds,
        source_artifacts: selectedSession.source_artifacts,
      });
      await refreshSelectedSession();
      setMessage("Draft session updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSessionId || !selectedId) return;
    const ok = confirm("Delete this draft session?");
    if (!ok) return;
    try {
      setLoading(true);
      setError(null);
      await deleteDraftSession(selectedSessionId);
      const sessions = await listBlueprintDraftSessions(selectedId);
      setDraftSessions(sessions.sessions);
      const nextId = sessions.sessions[0]?.id ?? null;
      setSelectedSessionId(nextId);
      if (!nextId) {
        setSelectedSession(null);
        setDraftJsonText("");
        setRevisionInstruction("");
        setSessionContextPackIds([]);
      }
      setMessage("Draft session deleted.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSession = async () => {
    if (!selectedSessionId || !selectedSession) return;
    const initialPrompt = (selectedSession.initial_prompt || "").trim();
    if (!initialPrompt) {
      setError("Initial prompt is required before submission.");
      return;
    }
    const packNamesById = new Map(contextPacks.map((pack) => [pack.id, pack.name]));
    const selectedNames = new Set((sessionContextPackIds || []).map((id) => packNamesById.get(id)).filter(Boolean));
    const missingRequired = requiredPackNames.filter((name) => !selectedNames.has(name));
    if (missingRequired.length > 0) {
      setError(`Missing required context packs: ${missingRequired.join(", ")}`);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await submitDraftSession(selectedSessionId, {
        initial_prompt: initialPrompt,
        selected_context_pack_ids: sessionContextPackIds,
        source_artifacts: selectedSession.source_artifacts,
        generate_code: selectedSession.kind === "solution",
      });
      if (result.entity_type === "blueprint" && result.entity_id) {
        await load();
        setSelectedId(result.entity_id);
      }
      setMessage(
        `Submitted ${selectedSession.kind === "solution" ? "as Solution" : "as Blueprint"} (${result.status}).`
      );
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
              {devTasks.length > 0 && (
                <div className="inline-actions">
                  <button
                    className="ghost small"
                    onClick={() => setDevTaskPage((prev) => Math.max(1, prev - 1))}
                    disabled={devTaskPage <= 1}
                  >
                    Prev
                  </button>
                  <span className="muted small">
                    Page {devTaskPage} / {devTaskTotalPages}
                  </span>
                  <button
                    className="ghost small"
                    onClick={() => setDevTaskPage((prev) => Math.min(devTaskTotalPages, prev + 1))}
                    disabled={devTaskPage >= devTaskTotalPages}
                  >
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
                        <strong>{session.title || session.name}</strong>
                        <span className="muted small">{session.kind || session.blueprint_kind}</span>
                      </div>
                      <span className="muted small">{session.status}</span>
                    </button>
                  ))}
                </div>
                {!selectedSession ? (
                  <p className="muted">Select a draft session to view details.</p>
                ) : (
                  <div className="draft-session-layout">
                    <section className="draft-section">
                      <div className="card-header">
                        <h4>Session</h4>
                        <div className="inline-actions">
                          <button className="ghost" onClick={handleUpdateSessionMetadata} disabled={loading}>
                            Save metadata
                          </button>
                          <button className="danger" onClick={handleDeleteSession} disabled={loading}>
                            Delete session
                          </button>
                        </div>
                      </div>
                      <label className="stacked-field">
                        Title
                        <input
                          value={selectedSession.title || ""}
                          onChange={(event) =>
                            setSelectedSession((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                          }
                        />
                      </label>
                      <div className="form-grid">
                        <label>
                          Draft kind
                          <select
                            value={selectedSession.kind || "blueprint"}
                            onChange={async (event) => {
                              const nextKind = event.target.value as "blueprint" | "solution";
                              setSelectedSession((prev) => (prev ? { ...prev, kind: nextKind } : prev));
                              const defaults = await getContextPackDefaults({
                                draft_kind: nextKind,
                                namespace: selectedSession.namespace ?? undefined,
                                project_key: selectedSession.project_key ?? undefined,
                                generate_code: nextKind === "solution",
                              });
                              setRecommendedSessionPackIds(defaults.recommended_context_pack_ids);
                              setRequiredPackNames(defaults.required_pack_names);
                            }}
                          >
                            <option value="blueprint">Blueprint draft</option>
                            <option value="solution">Solution draft</option>
                          </select>
                        </label>
                        <label>
                          Namespace
                          <input
                            value={selectedSession.namespace ?? ""}
                            onChange={(event) =>
                              setSelectedSession((prev) => (prev ? { ...prev, namespace: event.target.value } : prev))
                            }
                          />
                        </label>
                        <label className="span-full">
                          Project key
                          <input
                            value={selectedSession.project_key ?? ""}
                            onChange={(event) =>
                              setSelectedSession((prev) => (prev ? { ...prev, project_key: event.target.value } : prev))
                            }
                          />
                        </label>
                      </div>
                      <div className="detail-grid draft-session-meta">
                        <div>
                          <div className="label">Status</div>
                          <span className="muted">{selectedSession.status}</span>
                        </div>
                        <div>
                          <div className="label">Job ID</div>
                          <span className="muted draft-inline-wrap">{selectedSession.job_id ?? "—"}</span>
                        </div>
                        <div>
                          <div className="label">Context Hash</div>
                          <span className="muted draft-inline-wrap">{selectedSession.effective_context_hash ?? "—"}</span>
                        </div>
                        <div>
                          <div className="label">Blueprint Kind</div>
                          <span className="muted">{selectedSession.blueprint_kind}</span>
                        </div>
                      </div>
                      {selectedSession.last_error && (
                        <InlineMessage tone="error" title="Last error" body={selectedSession.last_error} />
                      )}
                    </section>

                    <section className="draft-section">
                      <h4>Context packs</h4>
                      <div className="inline-actions draft-context-filters">
                        <select
                          value={contextPackPurposeFilter}
                          onChange={(event) =>
                            setContextPackPurposeFilter(event.target.value as "all" | "planner" | "coder")
                          }
                        >
                          <option value="all">Purpose: all</option>
                          <option value="planner">Purpose: planner</option>
                          <option value="coder">Purpose: coder</option>
                        </select>
                        <select
                          value={contextPackScopeFilter}
                          onChange={(event) =>
                            setContextPackScopeFilter(event.target.value as "all" | "global" | "namespace" | "project")
                          }
                        >
                          <option value="all">Scope: all</option>
                          <option value="global">Scope: global</option>
                          <option value="namespace">Scope: namespace</option>
                          <option value="project">Scope: project</option>
                        </select>
                      </div>
                      <label className="stacked-field">
                        Context packs for session
                        <select
                          className="draft-pack-select"
                          multiple
                          size={Math.min(Math.max(filteredContextPacks.length, 3), 8)}
                          value={sessionContextPackIds}
                          onChange={handleSessionContextPackSelect}
                        >
                          {filteredContextPacks.map((pack) => (
                            <option key={pack.id} value={pack.id}>
                              {pack.name} ({pack.scope}) v{pack.version} [{pack.purpose}]
                              {pack.namespace ? ` ns:${pack.namespace}` : ""}
                              {pack.project_key ? ` project:${pack.project_key}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="muted small">
                        Required defaults: {requiredPackNames.length > 0 ? requiredPackNames.join(", ") : "none"}
                      </span>
                      <span className="muted small">
                        Recommended defaults:{" "}
                        {recommendedSessionPackIds.length > 0
                          ? recommendedSessionPackIds
                              .map((id) => contextPacks.find((pack) => pack.id === id)?.name ?? id)
                              .join(", ")
                          : "none"}
                      </span>
                    </section>

                    <section className="draft-section">
                      <h4>Workflow</h4>
                      <div className="inline-actions draft-workflow-actions">
                        <button className="ghost" onClick={handleResolveContext} disabled={loading}>
                          1. Resolve context
                        </button>
                        <button className="ghost" onClick={handleGenerateDraft} disabled={loading}>
                          2. Generate draft
                        </button>
                        <button className="ghost" onClick={handlePublishDraft} disabled={loading}>
                          3. Publish draft
                        </button>
                        <button className="primary" onClick={handleSubmitSession} disabled={loading}>
                          4. {selectedSession.kind === "solution" ? "Submit as Solution" : "Submit as Blueprint"}
                        </button>
                      </div>
                    </section>

                    <section className="draft-section">
                      <h4>Prompt</h4>
                      <label className="stacked-field">
                        Initial prompt
                        <textarea
                          rows={8}
                          value={selectedSession.initial_prompt ?? ""}
                          disabled={Boolean(selectedSession.initial_prompt_locked)}
                          onChange={(event) =>
                            setSelectedSession((prev) => (prev ? { ...prev, initial_prompt: event.target.value } : prev))
                          }
                        />
                      </label>
                      {selectedSession.initial_prompt_locked && (
                        <span className="muted small">
                          Initial prompt is locked after first submission. Use revision instructions for changes.
                        </span>
                      )}
                      <label className="stacked-field">
                        Prompt sources (transcript text)
                        <textarea
                          rows={6}
                          value={
                            (selectedSession.source_artifacts ?? []).find((item) => item.type === "audio_transcript")
                              ?.content ?? ""
                          }
                          onChange={(event) =>
                            setSelectedSession((prev) => {
                              if (!prev) return prev;
                              const others = (prev.source_artifacts ?? []).filter((item) => item.type !== "audio_transcript");
                              const next = event.target.value.trim();
                              return {
                                ...prev,
                                source_artifacts: next
                                  ? [...others, { type: "audio_transcript", content: next }]
                                  : others,
                              };
                            })
                          }
                        />
                      </label>
                    </section>

                    <section className="draft-section">
                      <h4>Revision</h4>
                      <label className="stacked-field">
                        Revision instruction (for changes after initial draft)
                        <textarea
                          rows={4}
                          value={revisionInstruction || selectedSession.revision_instruction || ""}
                          onChange={(event) => setRevisionInstruction(event.target.value)}
                          disabled={!selectedSession.has_generated_output || !(selectedSession.initial_prompt ?? "").trim()}
                        />
                      </label>
                      <span className="muted small">Use this only after an initial draft has been generated.</span>
                      <button
                        className="ghost"
                        onClick={handleReviseDraft}
                        disabled={loading || !selectedSession.has_generated_output}
                      >
                        Revise draft
                      </button>
                    </section>

                    <section className="draft-section">
                      <div className="card-header">
                        <h4>Revisions</h4>
                        <div className="inline-actions">
                          <button className="ghost small" onClick={refreshSessionRevisions} disabled={loading}>
                            Refresh
                          </button>
                        </div>
                      </div>
                      <label className="stacked-field">
                        Search revisions
                        <input
                          value={revisionSearch}
                          placeholder="Search by instruction, summary, or diff..."
                          onChange={(event) => {
                            setRevisionSearch(event.target.value);
                            setRevisionPage(1);
                          }}
                        />
                      </label>
                      {sessionRevisions.length === 0 ? (
                        <span className="muted">No revisions yet.</span>
                      ) : (
                        <div className="instance-list">
                          {sessionRevisions.map((rev) => (
                            <div key={rev.id} className="instance-row">
                              <div>
                                <strong>
                                  r{rev.revision_number} • {rev.action}
                                </strong>
                                <span className="muted small">
                                  {rev.instruction || rev.diff_summary || "No instruction"}
                                </span>
                              </div>
                              <div className="stack" style={{ alignItems: "flex-end", gap: 4 }}>
                                <span className="muted small">{new Date(rev.created_at).toLocaleString()}</span>
                                <span className="muted small">Errors: {rev.validation_errors_count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="inline-actions">
                        <button
                          className="ghost small"
                          onClick={() => setRevisionPage((prev) => Math.max(1, prev - 1))}
                          disabled={revisionPage <= 1}
                        >
                          Prev
                        </button>
                        <span className="muted small">
                          Page {revisionPage} / {revisionTotalPages}
                        </span>
                        <button
                          className="ghost small"
                          onClick={() => setRevisionPage((prev) => Math.min(revisionTotalPages, prev + 1))}
                          disabled={revisionPage >= revisionTotalPages}
                        >
                          Next
                        </button>
                      </div>
                    </section>

                    <section className="draft-section">
                      <div className="card-header">
                        <h4>Draft output</h4>
                        <button className="ghost" onClick={handleSaveDraft} disabled={loading}>
                          Save draft JSON
                        </button>
                      </div>
                      <label className="stacked-field">
                        Draft JSON
                        <textarea
                          className="draft-json-editor"
                          rows={16}
                          value={draftJsonText}
                          onChange={(event) => setDraftJsonText(event.target.value)}
                        />
                      </label>
                      {selectedSession.requirements_summary && (
                        <div className="stack">
                          <strong>Requirements summary</strong>
                          <pre className="draft-output-pre">{selectedSession.requirements_summary}</pre>
                        </div>
                      )}
                      {selectedSession.diff_summary && (
                        <div className="stack">
                          <strong>Diff summary</strong>
                          <pre className="draft-output-pre">{selectedSession.diff_summary}</pre>
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
                        <pre className="draft-output-pre">
                          {selectedSession.effective_context_preview ?? "No context preview."}
                        </pre>
                      </div>
                    </section>
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
              <div className="form-grid">
                <label className="span-full">
                  New draft title
                  <input value={newSessionTitle} onChange={(event) => setNewSessionTitle(event.target.value)} />
                </label>
                <label>
                  Draft kind
                  <select
                    value={newSessionKind}
                    onChange={async (event) => {
                      const nextKind = event.target.value as "blueprint" | "solution";
                      setNewSessionKind(nextKind);
                      if (nextKind === "blueprint") {
                        setNewSessionGenerateCode(false);
                      }
                      await refreshRecommendedContextPacks({
                        kind: nextKind,
                        generateCode: nextKind === "solution" ? newSessionGenerateCode : false,
                        promptOnReset: true,
                      });
                    }}
                  >
                    <option value="blueprint">Blueprint draft</option>
                    <option value="solution">Solution draft</option>
                  </select>
                </label>
                <label>
                  Namespace (optional)
                  <input
                    value={newSessionNamespace}
                    onChange={async (event) => {
                      const namespace = event.target.value;
                      setNewSessionNamespace(namespace);
                      await refreshRecommendedContextPacks({ namespace, promptOnReset: true });
                    }}
                  />
                </label>
                <label className="span-full">
                  Project key (optional)
                  <input
                    value={newSessionProjectKey}
                    onChange={async (event) => {
                      const projectKey = event.target.value;
                      setNewSessionProjectKey(projectKey);
                      await refreshRecommendedContextPacks({ projectKey, promptOnReset: true });
                    }}
                  />
                </label>
                <label className="span-full">
                  <input
                    type="checkbox"
                    checked={newSessionGenerateCode}
                    disabled={newSessionKind === "blueprint"}
                    onChange={async (event) => {
                      const checked = event.target.checked;
                      setNewSessionGenerateCode(checked);
                      await refreshRecommendedContextPacks({ generateCode: checked, promptOnReset: true });
                    }}
                  />{" "}
                  Generate implementation/code
                </label>
                <label className="span-full">
                  Initial Prompt
                  <textarea
                    rows={5}
                    value={newSessionPrompt}
                    onChange={(event) => setNewSessionPrompt(event.target.value)}
                  />
                </label>
                <label className="span-full">
                  Add transcript text (optional)
                  <textarea
                    rows={3}
                    value={newSessionTranscript}
                    onChange={(event) => setNewSessionTranscript(event.target.value)}
                  />
                </label>
              </div>
              <label>
                Context packs for new draft sessions
                <select
                  multiple
                  size={Math.min(Math.max(filteredContextPacks.length, 3), 8)}
                  value={selectedContextPackIds}
                  onChange={handleContextPackSelect}
                >
                  {filteredContextPacks.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} ({pack.scope}) v{pack.version} [{pack.purpose}]
                      {pack.namespace ? ` ns:${pack.namespace}` : ""}
                      {pack.project_key ? ` project:${pack.project_key}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <span className="muted small">
                Required defaults: {requiredPackNames.length > 0 ? requiredPackNames.join(", ") : "none"}
              </span>
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
