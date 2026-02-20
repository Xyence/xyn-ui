import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import {
  commentOnWorkspaceArtifact,
  deprecateWorkspaceArtifact,
  getWorkspaceArtifact,
  moderateWorkspaceComment,
  publishWorkspaceArtifact,
  reactToWorkspaceArtifact,
  updateWorkspaceArtifact,
} from "../../api/xyn";
import type { ArtifactDetail } from "../../api/types";

export default function ArtifactDetailPage({ workspaceId, workspaceRole }: { workspaceId: string; workspaceRole: string }) {
  const { artifactId = "" } = useParams();
  const [item, setItem] = useState<ArtifactDetail | null>(null);
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [summary, setSummary] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!artifactId || !workspaceId) return;
    try {
      setError(null);
      const data = await getWorkspaceArtifact(workspaceId, artifactId);
      setItem(data);
      setBodyMarkdown(data.content?.body_markdown || "");
      setSummary(data.content?.summary || "");
    } catch (err) {
      setError((err as Error).message);
    }
  }, [workspaceId, artifactId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!artifactId) return;
    try {
      await updateWorkspaceArtifact(workspaceId, artifactId, { summary, body_markdown: bodyMarkdown });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const publish = async () => {
    if (!artifactId) return;
    try {
      await publishWorkspaceArtifact(workspaceId, artifactId);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const deprecate = async () => {
    if (!artifactId) return;
    try {
      await deprecateWorkspaceArtifact(workspaceId, artifactId);
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
          <button className="primary" onClick={save}>Save</button>
          <button className="primary" onClick={publish}>Publish</button>
          <button className="danger" onClick={deprecate}>Deprecate</button>
        </div>
      </div>
      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      <section className="card">
        <div className="form-grid">
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
