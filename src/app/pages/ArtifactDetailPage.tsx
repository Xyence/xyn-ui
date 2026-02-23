import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import { renderMarkdown } from "../../public/markdown";
import {
  commentOnWorkspaceArtifact,
  moderateWorkspaceComment,
  reactToWorkspaceArtifact,
  listAiAgents,
  listArticleCategories,
  invokeAi,
  convertArticleHtmlToMarkdown,
  createArticleRevision,
  getArticle,
  listArticleRevisions,
  transitionArticle,
  updateArticle,
} from "../../api/xyn";
import type { ArticleDetail, ArticleRevision } from "../../api/types";
import ArtifactWorkflowActions from "../components/workflow/ArtifactWorkflowActions";
import EditorCentricLayout from "../layouts/EditorCentricLayout";
import { resolveArtifactWorkflowActions, type WorkflowAction, type WorkflowActionId } from "../workflows/artifactWorkflow";
import { computeLineDiff } from "../utils/textDiff";
import { useNotifications } from "../state/notificationsStore";
import { useOperations } from "../state/operationRegistry";
import { canRewriteSelection, resolveAssistPrimaryAction } from "./articleAssistLogic";

type ActivityTab = "revisions" | "ai" | "discussion";
type RevisionMode = "list" | "view" | "diff";
type EditorMode = "edit" | "review";
const REVIEW_TOAST_ACTION = "article.ai.review";

type PendingAssist = {
  mode: "generate_draft" | "propose_edits" | "rewrite_selection";
  body: string;
  provider?: string;
  model?: string;
  agent_slug?: string;
};

type EditorSelection = {
  start: number;
  end: number;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
};

export default function ArtifactDetailPage({
  workspaceId,
  workspaceRole,
  canManageArticleLifecycle,
}: {
  workspaceId: string;
  workspaceRole: string;
  canManageArticleLifecycle: boolean;
}) {
  const { artifactId = "" } = useParams();
  const [item, setItem] = useState<ArticleDetail | null>(null);
  const [revisions, setRevisions] = useState<ArticleRevision[]>([]);
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [legacyBodyHtml, setLegacyBodyHtml] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState<string>("web");
  const [visibilityType, setVisibilityType] = useState<"public" | "authenticated" | "role_based" | "private">("private");
  const [allowedRolesText, setAllowedRolesText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<Array<{ slug: string; name: string; enabled: boolean }>>([]);
  const [commentBody, setCommentBody] = useState("");
  const [assistAgents, setAssistAgents] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [assistInstruction, setAssistInstruction] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);
  const [busyActionId, setBusyActionId] = useState<WorkflowActionId | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<WorkflowAction | null>(null);
  const [restoreRevisionId, setRestoreRevisionId] = useState<string | null>(null);
  const [activityTab, setActivityTab] = useState<ActivityTab>("ai");
  const [revisionMode, setRevisionMode] = useState<RevisionMode>("list");
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>("");
  const [compareRevisionId, setCompareRevisionId] = useState<string>("current");
  const [baselineBody, setBaselineBody] = useState("");
  const [baselineLabel, setBaselineLabel] = useState("latest saved revision");
  const [showPreview, setShowPreview] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("edit");
  const [pendingAssist, setPendingAssist] = useState<PendingAssist | null>(null);
  const [editorSelection, setEditorSelection] = useState<EditorSelection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const { push } = useNotifications();
  const { startOperation, finishOperation } = useOperations();

  const parseCsv = (value: string): string[] =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  const handleEditorSelect = useCallback((target: HTMLTextAreaElement) => {
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    if (end <= start) {
      setEditorSelection(null);
      return;
    }
    const selectedText = bodyMarkdown.slice(start, end);
    const contextRadius = 600;
    setEditorSelection({
      start,
      end,
      selectedText,
      contextBefore: bodyMarkdown.slice(Math.max(0, start - contextRadius), start),
      contextAfter: bodyMarkdown.slice(end, Math.min(bodyMarkdown.length, end + contextRadius)),
    });
  }, [bodyMarkdown]);

  const load = useCallback(async () => {
    if (!artifactId || !workspaceId) return;
    try {
      setError(null);
      const [articleRes, revisionsRes, categoriesRes] = await Promise.all([
        getArticle(artifactId),
        listArticleRevisions(artifactId),
        listArticleCategories(),
      ]);
      const article = articleRes.article;
      const nextRevisions = revisionsRes.revisions || [];
      const latestRevision = nextRevisions[0];
      const initialBody = article.body_markdown || latestRevision?.body_markdown || "";
      const fallbackHtml = article.body_html || latestRevision?.body_html || "";
      setItem(article);
      setRevisions(nextRevisions);
      setBodyMarkdown(initialBody);
      setLegacyBodyHtml(fallbackHtml);
      setSummary(article.summary || "");
      setCategory(article.category || "web");
      setVisibilityType(article.visibility_type || "private");
      setAllowedRolesText((article.allowed_roles || []).join(", "));
      setTagsText((article.tags || []).join(", "));
      setCategoryOptions(
        (categoriesRes.categories || []).map((entry) => ({ slug: entry.slug, name: entry.name, enabled: Boolean(entry.enabled) }))
      );
      setBaselineBody(initialBody);
      setBaselineLabel(latestRevision ? `r${latestRevision.revision_number}` : "latest saved revision");
      setPendingAssist(null);
      setEditorMode("edit");
      if (latestRevision?.id) {
        setSelectedRevisionId(latestRevision.id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [workspaceId, artifactId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onToastAction = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: string }>).detail || {};
      if (detail.action !== REVIEW_TOAST_ACTION) return;
      if (!pendingAssist) return;
      setEditorMode("review");
      setActivityTab("ai");
      editorRef.current?.focus();
    };
    window.addEventListener("xyn:notification-action", onToastAction as EventListener);
    return () => window.removeEventListener("xyn:notification-action", onToastAction as EventListener);
  }, [pendingAssist]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await listAiAgents({ purpose: "documentation", enabled: true });
        if (!mounted) return;
        const options = (data.agents || []).map((entry) => ({ id: entry.id, slug: entry.slug, name: entry.name }));
        setAssistAgents(options);
        if (!selectedAgent && options.length) {
          const stored = localStorage.getItem("xyn.articleAiAgentSlug") || "";
          setSelectedAgent(options.find((entry) => entry.slug === stored)?.slug || options[0].slug);
        }
      } catch {
        if (!mounted) return;
        setAssistAgents([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedAgent]);

  const save = async () => {
    if (!artifactId) return;
    try {
      setError(null);
      await updateArticle(artifactId, {
        category,
        visibility_type: visibilityType,
        allowed_roles: visibilityType === "role_based" ? parseCsv(allowedRolesText) : [],
        tags: parseCsv(tagsText),
      });
      await createArticleRevision(artifactId, {
        summary,
        body_markdown: bodyMarkdown,
        tags: parseCsv(tagsText),
        source: "manual",
      });
      await load();
      push({
        level: "success",
        title: "Revision saved",
        message: "Saved as new revision.",
        status: "succeeded",
        action: "article.save",
        entityType: "unknown",
        entityId: artifactId,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const convertLegacyHtml = async () => {
    if (!artifactId) return;
    try {
      setError(null);
      const result = await convertArticleHtmlToMarkdown(artifactId);
      if (result.converted) {
        push({
          level: "success",
          title: "Converted to markdown",
          message: "Created a new revision from legacy HTML.",
          status: "succeeded",
          action: "article.convert_html",
          entityType: "unknown",
          entityId: artifactId,
        });
      } else {
        push({
          level: "info",
          title: "No conversion needed",
          message: result.reason === "already_markdown" ? "Article already has markdown content." : "No conversion was needed.",
          status: "succeeded",
          action: "article.convert_html",
          entityType: "unknown",
          entityId: artifactId,
        });
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const runAssist = async (mode: "generate_draft" | "propose_edits" | "rewrite_selection") => {
    if (!artifactId) return;
    if (!selectedAgent) {
      setError("No documentation agent selected. Configure one in Platform -> AI -> Agents.");
      return;
    }
    if (mode === "rewrite_selection" && !editorSelection) return;
    const opId = `${artifactId}:${mode}:${Date.now()}`;
    startOperation({
      id: opId,
      type: "ai",
      label: mode === "generate_draft" ? "Generate draft" : mode === "propose_edits" ? "Propose edits" : "Rewrite selection",
      entityType: "article",
      entityId: artifactId,
    });
    try {
      setError(null);
      setAssistBusy(true);
      push({
        level: "info",
        title: "AI thinking",
        message: "Generating proposal…",
        status: "queued",
        action: "article.ai",
        entityType: "unknown",
        entityId: artifactId,
        dedupeKey: `article-ai:${artifactId}:${mode}`,
      });
      localStorage.setItem("xyn.articleAiAgentSlug", selectedAgent);
      const prompt =
        mode === "generate_draft"
          ? `Draft article content from this idea. Return markdown only. Idea:\n${assistInstruction || summary || item?.title || ""}`
          : mode === "rewrite_selection" && editorSelection
            ? [
                "Rewrite only the selected region and preserve all intent.",
                "Return only the rewritten selected text. Do not include markdown fences or commentary.",
                `Instruction: ${assistInstruction || "Improve clarity and flow."}`,
                "Selected text:",
                editorSelection.selectedText,
                "Context before:",
                editorSelection.contextBefore,
                "Context after:",
                editorSelection.contextAfter,
              ].join("\n\n")
            : `Suggest edits and provide an improved markdown version.\n\nInstruction: ${assistInstruction || "Improve clarity and readability."}\n\n${bodyMarkdown}`;
      const modeForApi = mode === "generate_draft" ? "draft" : mode === "rewrite_selection" ? "rewrite" : "edits";
      const result = await invokeAi({
        agent_slug: selectedAgent,
        messages: [{ role: "user", content: prompt }],
        metadata: { feature: "articles_ai_assist", artifact_id: artifactId, workspace_id: workspaceId, mode: modeForApi },
      });
      const rawBody = String(result.content || "").trim();
      if (!rawBody) throw new Error("AI returned empty content.");
      const nextBody =
        mode === "rewrite_selection" && editorSelection
          ? `${bodyMarkdown.slice(0, editorSelection.start)}${rawBody}${bodyMarkdown.slice(editorSelection.end)}`
          : rawBody;
      setPendingAssist({
        mode,
        body: nextBody,
        provider: result.provider,
        model: result.model,
        agent_slug: result.agent_slug,
      });
      setEditorMode("review");
      setActivityTab("ai");
      finishOperation({
        id: opId,
        status: "succeeded",
        summary: "AI suggestion ready",
      });
      push({
        level: "success",
        title: "AI suggestion ready",
        message: "Review changes in Article Editor.",
        status: "succeeded",
        action: "article.ai",
        entityType: "unknown",
        entityId: artifactId,
        ctaLabel: "Review changes",
        ctaAction: REVIEW_TOAST_ACTION,
        dedupeKey: `article-ai:${artifactId}:${mode}`,
      });
    } catch (err) {
      finishOperation({
        id: opId,
        status: "failed",
        summary: (err as Error).message,
      });
      push({
        level: "error",
        title: "AI assist failed",
        message: (err as Error).message,
        status: "failed",
        action: "article.ai",
        entityType: "unknown",
        entityId: artifactId,
      });
      setError((err as Error).message);
    } finally {
      setAssistBusy(false);
    }
  };

  const acceptAssist = async () => {
    if (!artifactId || !pendingAssist) return;
    try {
      setError(null);
      await createArticleRevision(artifactId, {
        summary,
        body_markdown: pendingAssist.body,
        tags: parseCsv(tagsText),
        source: "ai",
        provenance_json: {
          agent_slug: pendingAssist.agent_slug,
          provider: pendingAssist.provider,
          model_name: pendingAssist.model,
          invoked_at: new Date().toISOString(),
          mode:
            pendingAssist.mode === "generate_draft"
              ? "draft"
              : pendingAssist.mode === "rewrite_selection"
                ? "rewrite"
                : "edits",
        },
      });
      setBodyMarkdown(pendingAssist.body);
      setPendingAssist(null);
      setEditorMode("edit");
      await load();
      push({
        level: "success",
        title: "AI changes applied",
        message: "Saved as a new revision.",
        status: "succeeded",
        action: "article.ai.apply",
        entityType: "unknown",
        entityId: artifactId,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const transition = async (status: "reviewed" | "ratified" | "published" | "deprecated") => {
    if (!artifactId) return;
    try {
      await transitionArticle(artifactId, status);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const react = async (value: "endorse" | "oppose" | "neutral") => {
    if (!artifactId) return;
    try {
      await reactToWorkspaceArtifact(workspaceId, artifactId, value);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const addComment = async () => {
    if (!artifactId || !commentBody.trim()) return;
    try {
      await commentOnWorkspaceArtifact(workspaceId, artifactId, { body: commentBody });
      setCommentBody("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const moderate = async (commentId: string, status: "hidden" | "deleted") => {
    if (!artifactId) return;
    try {
      await moderateWorkspaceComment(workspaceId, artifactId, commentId, status);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const restoreRevision = async () => {
    if (!artifactId || !restoreRevisionId) return;
    const revision = revisions.find((entry) => entry.id === restoreRevisionId);
    if (!revision) return;
    try {
      setError(null);
      await createArticleRevision(artifactId, {
        summary: revision.summary || summary,
        body_markdown: revision.body_markdown,
        tags: parseCsv(tagsText),
        source: "restore",
        provenance_json: {
          restored_revision_id: revision.id,
          restored_revision_number: revision.revision_number,
          restored_at: new Date().toISOString(),
        },
      });
      setRestoreRevisionId(null);
      await load();
      push({
        level: "success",
        title: "Revision restored",
        message: `Restored r${revision.revision_number} as a new revision.`,
        status: "succeeded",
        action: "article.restore",
        entityType: "unknown",
        entityId: artifactId,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const selectedCategoryMeta = categoryOptions.find((entry) => entry.slug === category) || null;
  const isDeprecatedCategory = Boolean(selectedCategoryMeta && !selectedCategoryMeta.enabled);
  const selectableCategoryOptions = categoryOptions.filter((entry) => entry.enabled);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canSaveRevision = workspaceRole !== "reader";
  const canReact = workspaceRole !== "reader";
  const workflow = useMemo(
    () =>
      resolveArtifactWorkflowActions({
        artifactType: "article",
        article: {
          status: item?.status || "draft",
          visibility_type: visibilityType,
          allowed_roles: parseCsv(allowedRolesText),
          published_to: item?.published_to || [],
          summary,
          title: item?.title || "",
        },
        validation: {
          hasBodyMarkdown: Boolean(bodyMarkdown.trim()),
          hasSummary: Boolean(summary.trim()),
        },
        capabilities: {
          canManageLifecycle: canManageArticleLifecycle,
          canSaveRevision,
          canReact,
          canViewRevisions: true,
        },
      }),
    [allowedRolesText, bodyMarkdown, canManageArticleLifecycle, canReact, canSaveRevision, item?.published_to, item?.status, item?.title, summary, visibilityType]
  );

  const selectedRevision = useMemo(
    () => revisions.find((entry) => entry.id === selectedRevisionId) || revisions[0] || null,
    [revisions, selectedRevisionId]
  );

  const comparisonRevision = useMemo(() => {
    if (!selectedRevision) return null;
    if (compareRevisionId === "current") {
      return {
        id: "current",
        revision_number: 0,
        body_markdown: bodyMarkdown,
        summary,
      } as ArticleRevision;
    }
    return revisions.find((entry) => entry.id === compareRevisionId) || null;
  }, [selectedRevision, compareRevisionId, revisions, bodyMarkdown, summary]);

  const selectedRevisionDiff = useMemo(() => {
    if (!selectedRevision || !comparisonRevision) return null;
    return computeLineDiff(selectedRevision.body_markdown || "", comparisonRevision.body_markdown || "");
  }, [selectedRevision, comparisonRevision]);

  const pendingAssistDiff = useMemo(() => {
    if (!pendingAssist) return null;
    return computeLineDiff(bodyMarkdown, pendingAssist.body);
  }, [bodyMarkdown, pendingAssist]);

  const drift = useMemo(() => computeLineDiff(baselineBody, bodyMarkdown), [baselineBody, bodyMarkdown]);
  const hasBodyContent = Boolean(bodyMarkdown.trim() || revisions.length > 0);
  const primaryAssistAction = resolveAssistPrimaryAction(hasBodyContent);
  const selectionLength = editorSelection?.selectedText.length || 0;

  const executeAction = async (action: WorkflowAction) => {
    try {
      setBusyActionId(action.id);
      setError(null);
      switch (action.id) {
        case "save_revision":
          await save();
          break;
        case "mark_reviewed":
          await transition("reviewed");
          break;
        case "mark_ratified":
          await transition("ratified");
          break;
        case "publish":
          await transition("published");
          break;
        case "deprecate":
          await transition("deprecated");
          break;
        case "endorse":
          await react("endorse");
          break;
        case "oppose":
          await react("oppose");
          break;
        case "neutral":
          await react("neutral");
          break;
        case "view_revisions":
          setActivityTab("revisions");
          setRevisionMode("list");
          break;
        default:
          break;
      }
    } finally {
      setBusyActionId(null);
    }
  };

  const handleAction = async (action: WorkflowAction) => {
    if (!action.enabled) return;
    if (action.confirmation) {
      setConfirmingAction(action);
      return;
    }
    await executeAction(action);
  };

  const resolvePublishedUrl = (entry: NonNullable<ArticleDetail["published_to"]>[number]) => {
    if (!item) return "";
    const value = String(entry.target_value || "").trim();
    if (!value) return "";
    const slug = encodeURIComponent(String(item.slug || "").trim());
    const appendSlug = (base: string) => {
      if (!slug) return base;
      const normalized = base.replace(/\/+$/, "");
      if (normalized.endsWith(`/${slug}`)) return normalized;
      return `${normalized}/${slug}`;
    };
    if (entry.target_type === "external_url") return appendSlug(value);
    if (!origin) return value;
    if (entry.target_type === "public_web_path") {
      const base = `${origin}${value.startsWith("/") ? value : `/${value}`}`;
      return appendSlug(base);
    }
    const routeBase = `${origin}${value.startsWith("/") ? value : `/${value}`}`;
    if (value.startsWith("/app/")) return routeBase;
    return appendSlug(routeBase);
  };

  const revisionPanel = (
    <div className="stack revision-panel">
      <div className="card-header">
        <h3>Revision History</h3>
      </div>
      <div className="instance-list revision-list">
        {revisions.map((rev) => (
          <div className={`instance-row revision-row ${selectedRevision?.id === rev.id ? "active" : ""}`} key={rev.id}>
            <div className="revision-meta">
              <div className="revision-meta-top">
                <strong>r{rev.revision_number}</strong>
                <span className="muted small">
                  {rev.created_at || "—"}
                  {rev.created_by_email ? ` · ${rev.created_by_email}` : ""}
                </span>
              </div>
            </div>
            <div className="inline-actions revision-actions">
              <div className="revision-actions-main">
                <button
                  className="ghost sm"
                  type="button"
                  onClick={() => {
                    setSelectedRevisionId(rev.id);
                    setRevisionMode("view");
                  }}
                >
                  View
                </button>
                <button
                  className="ghost sm"
                  type="button"
                  onClick={() => {
                    setSelectedRevisionId(rev.id);
                    setCompareRevisionId("current");
                    setRevisionMode("diff");
                  }}
                >
                  Diff current
                </button>
                <button
                  className="ghost sm"
                  type="button"
                  onClick={() => {
                    setSelectedRevisionId(rev.id);
                    setRevisionMode("diff");
                  }}
                >
                  Compare
                </button>
              </div>
              <button className="danger sm revision-restore-button" type="button" onClick={() => setRestoreRevisionId(rev.id)}>
                Restore
              </button>
            </div>
          </div>
        ))}
        {revisions.length === 0 && <p className="muted">No revisions yet.</p>}
      </div>
      {selectedRevision && revisionMode === "view" && (
        <section className="diff-panel">
          <div className="card-header">
            <h4>Viewing r{selectedRevision.revision_number}</h4>
          </div>
          <textarea className="input" rows={8} value={selectedRevision.body_markdown || ""} readOnly />
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedRevision.body_markdown || "") }} />
        </section>
      )}
      {selectedRevision && revisionMode === "diff" && (
        <section className="diff-panel">
          <div className="inline-actions">
            <span className="muted small">Compare r{selectedRevision.revision_number} against</span>
            <select value={compareRevisionId} onChange={(event) => setCompareRevisionId(event.target.value)}>
              <option value="current">Current editor</option>
              {revisions
                .filter((entry) => entry.id !== selectedRevision.id)
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    r{entry.revision_number}
                  </option>
                ))}
            </select>
          </div>
          {selectedRevisionDiff && (
            <p className="muted small">
              +{selectedRevisionDiff.summary.added} / -{selectedRevisionDiff.summary.removed} lines changed
            </p>
          )}
          <div className="line-diff">
            {(selectedRevisionDiff?.ops || []).map((op, idx) => (
              <pre key={`${idx}-${op.type}`} className={`line-diff-row ${op.type}`}>
                <span>{op.type === "add" ? "+" : op.type === "remove" ? "-" : " "}</span>
                {op.text}
              </pre>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const aiPanel = (
    <div className="stack activity-ai-panel">
      <div className="card-header">
        <h3>AI Assist</h3>
      </div>
      <label>
        Documentation agent
        <select value={selectedAgent} onChange={(event) => setSelectedAgent(event.target.value)}>
          {!assistAgents.length && <option value="">No documentation agents found</option>}
          {assistAgents.map((agent) => (
            <option key={agent.id} value={agent.slug}>
              {agent.name} ({agent.slug})
            </option>
          ))}
        </select>
      </label>
      <label>
        Idea / instruction
        <textarea
          className="input"
          rows={4}
          value={assistInstruction}
          placeholder="What should the assistant do? e.g., tighten intro, add examples, change tone..."
          onChange={(event) => setAssistInstruction(event.target.value)}
        />
      </label>
      {selectionLength > 0 && <p className="muted small selection-chip">Selection: {selectionLength} chars</p>}
      <div className="inline-actions ai-assist-actions">
        <button
          className="primary sm"
          type="button"
          onClick={() => void runAssist(primaryAssistAction)}
          disabled={assistBusy || !selectedAgent}
        >
          {assistBusy ? "Thinking…" : primaryAssistAction === "generate_draft" ? "Generate draft" : "Propose edits"}
        </button>
        {primaryAssistAction !== "propose_edits" && (
          <button className="ghost sm" type="button" onClick={() => void runAssist("propose_edits")} disabled={assistBusy || !selectedAgent}>
            Propose edits
          </button>
        )}
        <button
          className="ghost sm"
          type="button"
          title={canRewriteSelection(selectionLength) ? "Rewrite selected text" : "Select text in the article to enable"}
          onClick={() => void runAssist("rewrite_selection")}
          disabled={assistBusy || !selectedAgent || !canRewriteSelection(selectionLength)}
        >
          Rewrite selection
        </button>
      </div>
      <p className="muted small">AI proposals never overwrite your article until you apply changes.</p>
      {pendingAssist && (
        <section className="diff-panel">
          <h4>Latest proposal: ready</h4>
          <p className="muted small">
            {pendingAssist.agent_slug} · {pendingAssist.provider} {pendingAssist.model}
          </p>
          <button className="ghost sm" type="button" onClick={() => setEditorMode("review")}>
            Review in editor
          </button>
        </section>
      )}
    </div>
  );

  const discussionPanel = (
    <div className="stack">
      <div className="card-header">
        <h3>Reactions & Comments</h3>
      </div>
      <p className="muted">
        endorse: {item?.reactions?.endorse || 0} | oppose: {item?.reactions?.oppose || 0} | neutral: {item?.reactions?.neutral || 0}
      </p>
      <label>
        Add comment
        <textarea className="input" rows={3} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} />
      </label>
      <button className="primary" type="button" onClick={addComment} disabled={!commentBody.trim()}>
        Reply
      </button>
      <div className="instance-list">
        {(item?.comments || []).map((comment) => (
          <div className="instance-row" key={comment.id}>
            <div>
              <strong>{comment.status}</strong>
              <span className="muted small">{comment.body}</span>
            </div>
            {(workspaceRole === "moderator" || workspaceRole === "admin") && (
              <div className="inline-actions">
                <button className="ghost" type="button" onClick={() => void moderate(comment.id, "hidden")}>
                  Hide
                </button>
                <button className="danger" type="button" onClick={() => void moderate(comment.id, "deleted")}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const activityPanel = (
    <div className="stack">
      <div className="editor-panel-tabs">
        <button
          type="button"
          title="Revisions"
          className={`ghost editor-tab-button ${activityTab === "revisions" ? "active" : ""}`}
          onClick={() => setActivityTab("revisions")}
        >
          <span className="editor-tab-label">Revisions</span>
        </button>
        <button
          type="button"
          title="AI Assist"
          className={`ghost editor-tab-button ${activityTab === "ai" ? "active" : ""}`}
          onClick={() => setActivityTab("ai")}
        >
          <span className="editor-tab-label">AI Assist</span>
        </button>
        <button
          type="button"
          title="Reactions & Comments"
          className={`ghost editor-tab-button ${activityTab === "discussion" ? "active" : ""}`}
          onClick={() => setActivityTab("discussion")}
        >
          <span className="editor-tab-label">Reactions</span>
        </button>
      </div>
      {activityTab === "revisions" && revisionPanel}
      {activityTab === "ai" && aiPanel}
      {activityTab === "discussion" && discussionPanel}
    </div>
  );

  const inspectorPanel = (
    <div className="stack">
      <div className="card-header">
        <h3>Inspector</h3>
      </div>
      <div className="field-group">
        <label className="field-label" htmlFor="article-category">
          Category
        </label>
        {isDeprecatedCategory ? (
          <div className="stacked-field">
            <input id="article-category" className="input" value={`${selectedCategoryMeta?.name || category} (${category})`} disabled />
            <span className="muted small">Deprecated category (read-only)</span>
          </div>
        ) : (
          <select id="article-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOptions.length === 0 && (
              <>
                <option value="web">web</option>
                <option value="guide">guide</option>
                <option value="core-concepts">core-concepts</option>
              </>
            )}
            {selectableCategoryOptions.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name} ({entry.slug})
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="field-group">
        <label className="field-label" htmlFor="article-visibility">
          Visibility
        </label>
        <select id="article-visibility" value={visibilityType} onChange={(event) => setVisibilityType(event.target.value as typeof visibilityType)}>
          <option value="public">public</option>
          <option value="authenticated">authenticated</option>
          <option value="role_based">role_based</option>
          <option value="private">private</option>
        </select>
      </div>
      {visibilityType === "role_based" && (
        <div className="field-group">
          <label className="field-label" htmlFor="article-allowed-roles">
            Allowed roles (comma-separated)
          </label>
          <input id="article-allowed-roles" className="input" value={allowedRolesText} onChange={(event) => setAllowedRolesText(event.target.value)} />
        </div>
      )}
      <div className="field-group">
        <label className="field-label" htmlFor="article-tags">
          Tags (comma-separated)
        </label>
        <input id="article-tags" className="input" value={tagsText} onChange={(event) => setTagsText(event.target.value)} />
      </div>
      <div className="field-group">
        <label className="field-label" htmlFor="article-summary">
          Summary
        </label>
        <textarea
          id="article-summary"
          className="input field-textarea"
          rows={4}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
      </div>
      <div className="inline-actions">
        <button className="primary" type="button" onClick={() => void save()}>
          Save revision
        </button>
        {!bodyMarkdown.trim() && legacyBodyHtml.trim() && (
          <button className="ghost" type="button" onClick={() => void convertLegacyHtml()}>
            Convert HTML to Markdown
          </button>
        )}
      </div>
      <div className="card-header">
        <h4>Published to</h4>
      </div>
      <div className="instance-list">
        {(item?.published_to || []).map((entry) => {
          const url = resolvePublishedUrl(entry);
          return (
            <div className="instance-row" key={`${entry.source}-${entry.target_type}-${entry.target_value}`}>
              <div>
                <strong>{entry.label}</strong>
                <span className="muted small">
                  {entry.target_type} · {entry.target_value} · {entry.source === "category" ? "Inherited (Category)" : "Article-specific"}
                </span>
                {url && (
                  <a className="muted small" href={url} target="_blank" rel="noreferrer noopener" style={{ display: "block", marginTop: 4 }}>
                    {url}
                  </a>
                )}
              </div>
            </div>
          );
        })}
        {(item?.published_to || []).length === 0 && <p className="muted">No publish bindings resolved.</p>}
      </div>
    </div>
  );

  const topSection = (
    <div className="stack">
      <div className="page-header">
        <div>
          <h2>{item?.title || "Artifact"}</h2>
          <p className="muted">Governed article workflow controls</p>
        </div>
      </div>
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      <ArtifactWorkflowActions workflow={workflow} busyActionId={busyActionId} onRunAction={handleAction} />
    </div>
  );

  const mainSection = (
    <div className="stack">
      <div className="card-header">
        <h3>Article Editor</h3>
        <div className="inline-actions editor-header-actions">
          <span className="muted small editor-drift-text">
            Drift from {baselineLabel}: +{drift.summary.added} / -{drift.summary.removed}
          </span>
          {pendingAssist && (
            <button className={`ghost sm ${editorMode === "review" ? "active" : ""}`} type="button" onClick={() => setEditorMode("review")}>
              Review proposal
            </button>
          )}
          {pendingAssist && editorMode === "review" && (
            <button className="ghost sm" type="button" onClick={() => setEditorMode("edit")}>
              Back to edit
            </button>
          )}
          <label className="checkbox-row">
            <input type="checkbox" checked={showPreview} onChange={(event) => setShowPreview(event.target.checked)} />
            Preview
          </label>
        </div>
      </div>
      {editorMode === "review" && pendingAssist && (
        <section className="diff-panel article-review-panel">
          <div className="card-header">
            <h4>Suggested edits</h4>
            <span className="muted small">
              +{pendingAssistDiff?.summary.added || 0} / -{pendingAssistDiff?.summary.removed || 0} lines
            </span>
          </div>
          <div className="line-diff article-review-diff">
            {(pendingAssistDiff?.ops || []).map((op, idx) => (
              <pre key={`${idx}-${op.type}`} className={`line-diff-row ${op.type}`}>
                <span>{op.type === "add" ? "+" : op.type === "remove" ? "-" : " "}</span>
                {op.text}
              </pre>
            ))}
          </div>
          <div className="inline-actions">
            <button className="primary" type="button" onClick={() => void acceptAssist()}>
              Apply changes
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setPendingAssist(null);
                setEditorMode("edit");
              }}
            >
              Discard
            </button>
          </div>
        </section>
      )}
      <div className={`editor-body ${showPreview ? "split" : ""}`}>
        <textarea
          ref={editorRef}
          className="input editor-textarea"
          rows={24}
          value={bodyMarkdown}
          onChange={(event) => setBodyMarkdown(event.target.value)}
          onSelect={(event) => handleEditorSelect(event.currentTarget)}
          onKeyUp={(event) => handleEditorSelect(event.currentTarget)}
          onMouseUp={(event) => handleEditorSelect(event.currentTarget)}
          aria-label="Article editor markdown"
        />
        {showPreview && <div className="editor-preview markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(bodyMarkdown) }} />}
      </div>
    </div>
  );

  return (
    <>
      <EditorCentricLayout top={topSection} main={mainSection} inspector={inspectorPanel} activity={activityPanel} />
      {confirmingAction?.confirmation && (
        <div className="modal-backdrop" onClick={() => setConfirmingAction(null)}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>{confirmingAction.confirmation.title}</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              {confirmingAction.confirmation.body}
            </p>
            {confirmingAction.id === "publish" && (
              <p className="muted small" style={{ marginTop: 8 }}>
                This action will make the article live on its configured publish targets.
              </p>
            )}
            {confirmingAction.id === "deprecate" && (
              <p className="muted small" style={{ marginTop: 8 }}>
                Deprecated articles are retained for history and audit but removed from active workflows.
              </p>
            )}
            <div className="inline-actions" style={{ marginTop: 12 }}>
              <button className="ghost" type="button" onClick={() => setConfirmingAction(null)}>
                Cancel
              </button>
              <button
                className={confirmingAction.intent === "danger" ? "danger" : "primary"}
                type="button"
                onClick={async () => {
                  const next = confirmingAction;
                  setConfirmingAction(null);
                  await executeAction(next);
                }}
              >
                {confirmingAction.confirmation.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
      {restoreRevisionId && (
        <div className="modal-backdrop" onClick={() => setRestoreRevisionId(null)}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Restore revision</h3>
            <p className="muted" style={{ marginTop: 8 }}>
              This creates a new revision from the selected historical revision. Existing history is preserved.
            </p>
            {selectedRevisionDiff && (
              <p className="muted small" style={{ marginTop: 8 }}>
                Selected diff summary: +{selectedRevisionDiff.summary.added} / -{selectedRevisionDiff.summary.removed}
              </p>
            )}
            <div className="inline-actions" style={{ marginTop: 12 }}>
              <button className="ghost" type="button" onClick={() => setRestoreRevisionId(null)}>
                Cancel
              </button>
              <button className="primary" type="button" onClick={() => void restoreRevision()}>
                Restore as new revision
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
