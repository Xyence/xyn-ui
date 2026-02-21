import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import { getArticle, listArticles, transitionArticle, updateArticle, createArticleRevision } from "../../api/xyn";
import type { ArticleDetail, ArticleSummary } from "../../api/types";
import { renderMarkdown } from "../../public/markdown";

function useQuery() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search), [location.search]);
}

type GuidesPageProps = {
  roles?: string[];
};

export default function GuidesPage({ roles = [] }: GuidesPageProps) {
  const navigate = useNavigate();
  const query = useQuery();
  const [docs, setDocs] = useState<ArticleSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>(query.get("id") || "");
  const [selectedDoc, setSelectedDoc] = useState<ArticleDetail | null>(null);
  const [editBody, setEditBody] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canEdit = roles.includes("platform_admin") || roles.includes("platform_architect");
  const editMode = query.get("edit") === "1";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        const response = await listArticles({ include_unpublished: true });
        if (!mounted) return;
        const guides = (response.articles || []).filter((doc) =>
          ["guide", "core-concepts", "tutorial"].includes(doc.category)
        );
        setDocs(guides);
        const requestedId = query.get("id") || "";
        const preferred = guides.find((doc) => doc.slug === "core-concepts") || guides[0];
        const target = requestedId && guides.some((doc) => doc.id === requestedId) ? requestedId : preferred?.id || "";
        if (target) {
          setSelectedId(target);
        }
      } catch (err) {
        if (mounted) setError((err as Error).message);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [query]);

  useEffect(() => {
    const tour = query.get("tour");
    if (!tour) return;
    window.dispatchEvent(new CustomEvent("xyn:start-tour", { detail: { slug: tour } }));
    navigate("/app/guides", { replace: true });
  }, [navigate, query]);

  useEffect(() => {
    let mounted = true;
    if (!selectedId) {
      setSelectedDoc(null);
      return;
    }
    (async () => {
      try {
        setError(null);
        const response = await getArticle(selectedId);
        if (mounted) {
          setSelectedDoc(response.article);
          setEditBody(response.article.body_markdown || "");
        }
      } catch (err) {
        if (mounted) setError((err as Error).message);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Guides</h2>
          <p className="muted">Governed guide artifacts bound to routes and visibility controls.</p>
        </div>
      </div>

      {message && <InlineMessage tone="info" title="Guide" body={message} />}
      {error && <InlineMessage tone="error" title="Error" body={error} />}

      <div className="two-col-layout">
        <section className="card">
          <div className="card-header">
            <h3>Guide Index</h3>
          </div>
          <div className="guides-section">
            <div className="guides-subheader">Documentation</div>
            {docs.length === 0 ? (
              <p className="muted">No guide articles available yet.</p>
            ) : (
              <div className="guides-list">
                {docs.map((doc) => (
                  <button
                    type="button"
                    key={doc.id}
                    className={`instance-row ${selectedId === doc.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedId(doc.id);
                      setMessage(null);
                    }}
                  >
                    <strong>{doc.title}</strong>
                    <span className="muted small">{doc.category} · {doc.tags.join(", ") || "guide"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="guides-section">
            <div className="guides-subheader">Tours</div>
            <button
              className="instance-row guides-tour-row"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("xyn:start-tour", { detail: { slug: "deploy-subscriber-notes" } }));
                setMessage("Tour started.");
              }}
            >
              <div>
                <strong>Deploy Subscriber Notes</strong>
                <span className="muted small">Guided end-to-end onboarding flow</span>
              </div>
              <span className="guides-tour-arrow" aria-hidden="true">
                <ChevronRight size={16} />
              </span>
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>{selectedDoc?.title || "Guide"}</h3>
          </div>
          {selectedDoc ? (
            <>
              <p className="muted small">
                Updated {selectedDoc.updated_at || "—"}
                {selectedDoc.updated_by_email ? ` by ${selectedDoc.updated_by_email}` : ""}
              </p>
              {canEdit && editMode ? (
                <div className="stack">
                  <textarea rows={18} value={editBody} onChange={(event) => setEditBody(event.target.value)} />
                  <div className="inline-actions">
                    <button
                      className="primary"
                      disabled={saving}
                      onClick={async () => {
                        if (!selectedDoc) return;
                        try {
                          setSaving(true);
                          await updateArticle(selectedDoc.id, { category: selectedDoc.category });
                          const updated = await createArticleRevision(selectedDoc.id, {
                            body_markdown: editBody,
                            summary: selectedDoc.summary,
                            tags: selectedDoc.tags,
                            source: "manual",
                          });
                          setSelectedDoc(updated.article);
                          setMessage("Guide draft saved.");
                        } catch (err) {
                          setError((err as Error).message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Save draft
                    </button>
                    <button
                      className="ghost"
                      disabled={saving}
                      onClick={async () => {
                        if (!selectedDoc) return;
                        try {
                          setSaving(true);
                          const published = await transitionArticle(selectedDoc.id, "published");
                          setSelectedDoc(published.article);
                          setMessage("Guide published.");
                        } catch (err) {
                          setError((err as Error).message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Publish
                    </button>
                  </div>
                </div>
              ) : (
                <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedDoc.body_markdown) }} />
              )}
            </>
          ) : (
            <p className="muted">Select a guide.</p>
          )}
        </section>
      </div>
    </>
  );
}
