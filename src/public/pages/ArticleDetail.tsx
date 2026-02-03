import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPublicArticle } from "../../api/public";
import { renderMermaidIn } from "../mermaid";
import { renderMarkdown } from "../markdown";
import type { PublicArticleDetail } from "../types";

export default function ArticleDetail() {
  const { slug } = useParams();
  const [article, setArticle] = useState<PublicArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetchPublicArticle(slug)
      .then((data) => {
        setArticle(data);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!article) return;
    void renderMermaidIn(contentRef.current);
  }, [article?.body_html, article?.body_md]);

  if (loading) {
    return <p className="muted">Loading article...</p>;
  }

  if (error || !article) {
    return (
      <div className="empty-state">
        <p>We couldn't find that article.</p>
        <Link className="ghost" to="/articles">
          Back to articles
        </Link>
      </div>
    );
  }

  const published = article.published_at ? new Date(article.published_at) : null;

  return (
    <article className="article-detail">
      <Link className="ghost" to="/articles">
        ← Back to articles
      </Link>
      <h1>{article.title}</h1>
      {published && (
        <p className="muted">Published {published.toLocaleDateString()}</p>
      )}
      {article.summary && <p className="lead">{article.summary}</p>}
      <div
        ref={contentRef}
        className="rich-text"
        dangerouslySetInnerHTML={{
          __html: article.body_html || renderMarkdown(article.body_md),
        }}
      />
      <Link className="ghost" to="/articles">
        ← Back to articles
      </Link>
    </article>
  );
}
