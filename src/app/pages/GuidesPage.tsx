import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import InlineMessage from "../../components/InlineMessage";
import { getDocBySlug, listDocs } from "../../api/xyn";
import type { DocPage } from "../../api/types";
import { renderMarkdown } from "../../public/markdown";

function useQuery() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search), [location.search]);
}

export default function GuidesPage() {
  const navigate = useNavigate();
  const query = useQuery();
  const [docs, setDocs] = useState<DocPage[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>(query.get("slug") || "");
  const [selectedDoc, setSelectedDoc] = useState<DocPage | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        const response = await listDocs({ tags: ["guide"], includeDrafts: true });
        if (!mounted) return;
        setDocs(response.docs);
        const target = selectedSlug || response.docs[0]?.slug || "";
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
  }, [selectedSlug]);

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
        if (mounted) setSelectedDoc(response.doc);
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
          {docs.length === 0 ? (
            <p className="muted">No guide docs available yet.</p>
          ) : (
            <div className="list-group">
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
          <div className="actions" style={{ marginTop: 12 }}>
            <button
              className="ghost"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("xyn:start-tour", { detail: { slug: "deploy-subscriber-notes" } }));
                setMessage("Tour started.");
              }}
            >
              Start "Deploy Subscriber Notes" tour
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
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedDoc.body_markdown) }} />
            </>
          ) : (
            <p className="muted">Select a guide.</p>
          )}
        </section>
      </div>
    </>
  );
}
