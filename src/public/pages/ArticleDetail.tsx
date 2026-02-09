import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPublicArticle } from "../../api/public";
import type { PublicArticleDetail } from "../types";

export default function ArticleDetail() {
  const { slug } = useParams();
  const [article, setArticle] = useState<PublicArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    fetchPublicArticle(slug)
      .then((data) => {
        if (!active) return;
        setArticle(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError((err as Error).message);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return <p className="muted">Loading article...</p>;
  }

  if (error) {
    return <p className="muted">{error}</p>;
  }

  if (!article) {
    return <p className="muted">Article not found.</p>;
  }

  return (
    <div className="public-article">
      <Link className="ghost" to="/articles">
        ← Back to articles
      </Link>
      <h1 className="page-title">{article.title}</h1>
      {article.summary && <p className="article-summary muted">{article.summary}</p>}
      {article.body_html && (
        <div className="article-body" dangerouslySetInnerHTML={{ __html: article.body_html }} />
      )}
    </div>
  );
}
