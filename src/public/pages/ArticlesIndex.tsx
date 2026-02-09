import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPublicArticles } from "../../api/public";
import { useMenuItems } from "../PublicShell";
import type { PublicArticleSummary } from "../types";

export default function ArticlesIndex() {
  const [articles, setArticles] = useState<PublicArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const menuItems = useMenuItems();

  const menuLabel = useMemo(() => {
    return menuItems.find((item) => item.path === "/articles")?.label || "Articles";
  }, [menuItems]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublicArticles()
      .then((data) => {
        if (!active) return;
        setArticles(data.items || []);
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
  }, []);

  if (loading) {
    return <p className="muted">Loading articles...</p>;
  }

  if (error) {
    return <p className="muted">{error}</p>;
  }

  if (!articles.length) {
    return <p className="muted">No articles published yet.</p>;
  }

  return (
    <div className="public-articles">
      <h1 className="page-title">{menuLabel}</h1>
      <div className="article-list">
        {articles.map((article) => (
          <article key={article.slug} className="article-card">
            <h2>{article.title}</h2>
            {article.summary && <p className="muted">{article.summary}</p>}
            <Link className="ghost" to={`/articles/${article.slug}`}>
              Read article →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
