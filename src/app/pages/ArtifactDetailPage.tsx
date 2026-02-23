import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import ArtifactWorkflowActions from "../components/workflow/ArtifactWorkflowActions";
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
import { resolveArtifactWorkflowActions, type WorkflowAction, type WorkflowActionId } from "../workflows/artifactWorkflow";

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
  const revisionsRef = useRef<HTMLElement | null>(null);
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const latestRevision = (revisionsRes.revisions || [])[0];
      const initialBody = article.body_markdown || latestRevision?.body_markdown || "";
      const fallbackHtml = article.body_html || latestRevision?.body_html || "";
      setItem(article);
      setRevisions(revisionsRes.revisions || []);
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
    } catch (err) {
      setError((err as Error).message);
    }
  }, [workspaceId, artifactId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const parseCsv = (value: string): string[] =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  const save = async () => {
    if (!artifactId) return;
    try {
      setMessage(null);
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
      setMessage("Saved as new revision.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const convertLegacyHtml = async () => {
    if (!artifactId) return;
    try {
      setError(null);
      setMessage(null);
      const result = await convertArticleHtmlToMarkdown(artifactId);
      if (result.converted) {
        setMessage("Converted legacy HTML body to markdown and created a new revision.");
      } else {
        setMessage(result.reason === "already_markdown" ? "Article already has markdown content." : "No conversion was needed.");
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const runAssist = async (mode: "draft" | "rewrite" | "edits") => {
    if (!artifactId) return;
    if (!selectedAgent) {
      setError("No documentation agent selected. Configure one in Platform -> AI -> Agents.");
      return;
    }
    try {
      setError(null);
      setMessage(null);
      setAssistBusy(true);
      localStorage.setItem("xyn.articleAiAgentSlug", selectedAgent);
      const prompt =
        mode === "draft"
          ? `Draft article content from this idea. Return markdown only. Idea:\n${assistInstruction || summary || item?.title || ""}`
          : mode === "rewrite"
            ? `Rewrite this article for clarity. Keep meaning and output markdown only.\n\n${bodyMarkdown}`
            : `Suggest edits and provide an improved markdown version.\n\n${bodyMarkdown}`;
      const result = await invokeAi({
        agent_slug: selectedAgent,
        messages: [{ role: "user", content: prompt }],
        metadata: { feature: "articles_ai_assist", artifact_id: artifactId, mode },
      });
      const nextBody = String(result.content || "").trim();
      if (!nextBody) {
        throw new Error("AI returned empty content.");
      }
      setBodyMarkdown(nextBody);
      await createArticleRevision(artifactId, {
        summary,
        body_markdown: nextBody,
        tags: parseCsv(tagsText),
        source: "ai",
        provenance_json: {
          agent_slug: result.agent_slug,
          provider: result.provider,
          model_name: result.model,
          invoked_at: new Date().toISOString(),
          mode,
        },
      });
      await load();
      setMessage(`AI ${mode} complete.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAssistBusy(false);
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

  const executeAction = async (action: WorkflowAction) => {
    try {
      setBusyActionId(action.id);
      setError(null);
      setMessage(null);
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
          revisionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (entry.target_type === "external_url") {
      return appendSlug(value);
    }
    if (!origin) return value;
    if (entry.target_type === "public_web_path") {
      const base = `${origin}${value.startsWith("/") ? value : `/${value}`}`;
      return appendSlug(base);
    }
    const routeBase = `${origin}${value.startsWith("/") ? value : `/${value}`}`;
    if (value.startsWith("/app/")) return routeBase;
    return appendSlug(routeBase);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{item?.title || "Artifact"}</h2>
          <p className="muted">Governed article workflow controls</p>
        </div>
      </div>
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}
      <ArtifactWorkflowActions workflow={workflow} busyActionId={busyActionId} onRunAction={handleAction} />
      <section className="card">
        <div className="form-grid">
          <label>
            Category
            {isDeprecatedCategory ? (
              <div className="stacked-field">
                <input className="input" value={`${selectedCategoryMeta?.name || category} (${category})`} disabled />
                <span className="muted small">Deprecated category (read-only)</span>
              </div>
            ) : (
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
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
          </label>
          <label>
            Visibility
            <select value={visibilityType} onChange={(event) => setVisibilityType(event.target.value as typeof visibilityType)}>
              <option value="public">public</option>
              <option value="authenticated">authenticated</option>
              <option value="role_based">role_based</option>
              <option value="private">private</option>
            </select>
          </label>
          {visibilityType === "role_based" && (
            <label>
              Allowed roles (comma-separated)
              <input className="input" value={allowedRolesText} onChange={(event) => setAllowedRolesText(event.target.value)} />
            </label>
          )}
          <label>
            Tags (comma-separated)
            <input className="input" value={tagsText} onChange={(event) => setTagsText(event.target.value)} />
          </label>
          <label>
            Summary
            <textarea className="input" rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} />
          </label>
          <label>
            Body Markdown
            <textarea className="input" rows={16} value={bodyMarkdown} onChange={(event) => setBodyMarkdown(event.target.value)} />
          </label>
          {!bodyMarkdown.trim() && legacyBodyHtml.trim() && (
            <div className="muted small">
              Legacy HTML content exists for this article. Convert it to markdown to edit cleanly.
              <div style={{ marginTop: 8 }}>
                <button className="ghost" type="button" onClick={convertLegacyHtml}>
                  Convert HTML to Markdown
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="card">
        <div className="card-header">
          <h3>Published to</h3>
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
                    <a
                      className="muted small"
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ display: "block", marginTop: 4 }}
                    >
                      {url}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
          {(item?.published_to || []).length === 0 && <p className="muted">No publish bindings resolved.</p>}
        </div>
      </section>
      <section className="card" ref={revisionsRef}>
        <div className="card-header">
          <h3>Revision History</h3>
        </div>
        <div className="instance-list">
          {revisions.map((rev) => (
            <div className="instance-row" key={rev.id}>
              <div>
                <strong>r{rev.revision_number}</strong>
                <span className="muted small">
                  {rev.created_at || "—"}
                  {rev.created_by_email ? ` · ${rev.created_by_email}` : ""}
                </span>
              </div>
            </div>
          ))}
          {revisions.length === 0 && <p className="muted">No revisions yet.</p>}
        </div>
      </section>
      <section className="card">
        <div className="card-header">
          <h3>AI Assist</h3>
        </div>
        <div className="form-grid">
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
            <textarea className="input" rows={4} value={assistInstruction} onChange={(event) => setAssistInstruction(event.target.value)} />
          </label>
        </div>
        <div className="inline-actions">
          <button className="ghost" onClick={() => runAssist("draft")} disabled={assistBusy || !selectedAgent}>Draft from idea</button>
          <button className="ghost" onClick={() => runAssist("rewrite")} disabled={assistBusy || !selectedAgent}>Rewrite section</button>
          <button className="ghost" onClick={() => runAssist("edits")} disabled={assistBusy || !selectedAgent}>Suggest edits</button>
        </div>
      </section>
      <section className="card">
        <div className="card-header">
          <h3>Reactions</h3>
        </div>
        <p className="muted">
          endorse: {item?.reactions?.endorse || 0} | oppose: {item?.reactions?.oppose || 0} | neutral: {item?.reactions?.neutral || 0}
        </p>
      </section>
      <section className="card">
        <div className="card-header">
          <h3>Comments</h3>
        </div>
        <div className="stacked-field">
          <span>Add comment</span>
          <textarea className="input" rows={3} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} />
        </div>
        <button className="primary" onClick={addComment} disabled={!commentBody.trim()}>Reply</button>
        <div className="instance-list">
          {(item?.comments || []).map((comment) => (
            <div className="instance-row" key={comment.id}>
              <div>
                <strong>{comment.status}</strong>
                <span className="muted small">{comment.body}</span>
              </div>
              {(workspaceRole === "moderator" || workspaceRole === "admin") && (
                <div className="inline-actions">
                  <button className="ghost" onClick={() => moderate(comment.id, "hidden")}>Hide</button>
                  <button className="danger" onClick={() => moderate(comment.id, "deleted")}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      {confirmingAction?.confirmation && (
        <div className="modal-backdrop" onClick={() => setConfirmingAction(null)}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>{confirmingAction.confirmation.title}</h3>
            <p className="muted" style={{ marginTop: 8 }}>{confirmingAction.confirmation.body}</p>
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
              <button className="ghost" onClick={() => setConfirmingAction(null)}>
                Cancel
              </button>
              <button
                className={confirmingAction.intent === "danger" ? "danger" : "primary"}
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
    </>
  );
}
