import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import { getDocBySlug, listDocs, publishDoc, updateDoc } from "../../api/xyn";
import type { DocPage } from "../../api/types";
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
  const [docs, setDocs] = useState<DocPage[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>(query.get("slug") || "");
  const [selectedDoc, setSelectedDoc] = useState<DocPage | null>(null);
  const [editBody, setEditBody] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canEdit = roles.includes("platform_admin") || roles.includes("platform_architect");
  const editSlug = query.get("edit") || "";
  const preferredCoreConceptsSlug = "core-concepts";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        const response = await listDocs({ tags: ["guide"], includeDrafts: true });
        if (!mounted) return;
        const filteredDocs = response.docs.filter(
          (doc) => doc.slug !== "subscriber-notes" && doc.title !== "Subscriber Notes Walkthrough"
        );
        setDocs(filteredDocs);
        const requestedSlug = query.get("slug") || "";
        const hasRequested = requestedSlug && filteredDocs.some((doc) => doc.slug === requestedSlug);
        const defaultSlug = filteredDocs.some((doc) => doc.slug === preferredCoreConceptsSlug)
          ? preferredCoreConceptsSlug
          : filteredDocs[0]?.slug || "";
        const target = hasRequested ? requestedSlug : defaultSlug;
        if (target) {
          setSelectedSlug(target);
        }
      } catch (err) {
        if (mounted) {
          setError((err as Error).message);
        }
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
    if (!selectedSlug) {
      setSelectedDoc(null);
      return;
    }
    (async () => {
      try {
        setError(null);
        const response = await getDocBySlug(selectedSlug);
        if (mounted) {
          setSelectedDoc(response.doc);
          setEditBody(response.doc.body_markdown || "");
        }
      } catch (err) {
        if (mounted) setError((err as Error).message);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedSlug]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Guides</h2>
          <p className="muted">Route-bound docs and onboarding walkthroughs.</p>
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
              <p className="muted">No guide docs available yet.</p>
            ) : (
              <div className="guides-list">
                {docs.map((doc) => (
                  <button
                    type="button"
                    key={doc.id}
                    className={`instance-row ${selectedSlug === doc.slug ? "active" : ""}`}
                    onClick={() => {
                      setSelectedSlug(doc.slug);
                      setMessage(null);
                    }}
                  >
                    <strong>{doc.title}</strong>
                    <span className="muted small">{doc.tags.join(", ") || "guide"}</span>
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
              {canEdit && editSlug === selectedDoc.slug ? (
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
                          const updated = await updateDoc(selectedDoc.id, { body_markdown: editBody });
                          setSelectedDoc(updated.doc);
                          setMessage("Doc draft saved.");
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
                          const published = await publishDoc(selectedDoc.id);
                          setSelectedDoc(published.doc);
                          setMessage("Doc published.");
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
