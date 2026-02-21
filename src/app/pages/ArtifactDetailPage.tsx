import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import {
  commentOnWorkspaceArtifact,
  moderateWorkspaceComment,
  reactToWorkspaceArtifact,
  listAiAgents,
  invokeAi,
  createArticleRevision,
  getArticle,
  listArticleRevisions,
  transitionArticle,
  updateArticle,
} from "../../api/xyn";
import type { ArticleDetail, ArticleRevision } from "../../api/types";

export default function ArtifactDetailPage({ workspaceId, workspaceRole }: { workspaceId: string; workspaceRole: string }) {
  const { artifactId = "" } = useParams();
  const [item, setItem] = useState<ArticleDetail | null>(null);
  const [revisions, setRevisions] = useState<ArticleRevision[]>([]);
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState<string>("web");
  const [visibilityType, setVisibilityType] = useState<"public" | "authenticated" | "role_based" | "private">("private");
  const [allowedRolesText, setAllowedRolesText] = useState("");
  const [routeBindingsText, setRouteBindingsText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [assistAgents, setAssistAgents] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [assistInstruction, setAssistInstruction] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!artifactId || !workspaceId) return;
    try {
      setError(null);
      const [articleRes, revisionsRes] = await Promise.all([getArticle(artifactId), listArticleRevisions(artifactId)]);
      const article = articleRes.article;
      setItem(article);
      setRevisions(revisionsRes.revisions || []);
      setBodyMarkdown(article.body_markdown || "");
      setSummary(article.summary || "");
      setCategory(article.category || "web");
      setVisibilityType(article.visibility_type || "private");
      setAllowedRolesText((article.allowed_roles || []).join(", "));
      setRouteBindingsText((article.route_bindings || []).join(", "));
      setTagsText((article.tags || []).join(", "));
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
        allowed_roles: parseCsv(allowedRolesText),
        route_bindings: parseCsv(routeBindingsText),
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

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{item?.title || "Artifact"}</h2>
          <p className="muted">Status: {item?.status || "—"}</p>
        </div>
        <div className="inline-actions">
          <button className="ghost" onClick={() => react("endorse")}>Endorse</button>
          <button className="ghost" onClick={() => react("oppose")}>Oppose</button>
          <button className="ghost" onClick={() => react("neutral")}>Neutral</button>
          <button className="primary" onClick={save}>Save revision</button>
          <button className="ghost" onClick={() => transition("reviewed")}>Mark reviewed</button>
          <button className="ghost" onClick={() => transition("ratified")}>Mark ratified</button>
          <button className="primary" onClick={() => transition("published")}>Publish</button>
          <button className="danger" onClick={() => transition("deprecated")}>Deprecate</button>
        </div>
      </div>
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}
      <section className="card">
        <div className="form-grid">
          <label>
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="web">web</option>
              <option value="guide">guide</option>
              <option value="core-concepts">core-concepts</option>
              <option value="release-note">release-note</option>
              <option value="internal">internal</option>
              <option value="tutorial">tutorial</option>
            </select>
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
          <label>
            Allowed roles (comma-separated)
            <input className="input" value={allowedRolesText} onChange={(event) => setAllowedRolesText(event.target.value)} />
          </label>
          <label>
            Route bindings (comma-separated)
            <input className="input" value={routeBindingsText} onChange={(event) => setRouteBindingsText(event.target.value)} />
          </label>
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
        </div>
      </section>
      <section className="card">
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
        <label>
          Add comment
          <textarea className="input" rows={3} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} />
        </label>
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
    </>
  );
}
