import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPublicArticles } from "../../api/public";
import { useMenuItems } from "../PublicShell";
import type { PublicArticleSummary } from "../types";

type ArticlesIndexProps = {
  surfacePathOverride?: string;
};

export default function ArticlesIndex({ surfacePathOverride }: ArticlesIndexProps) {
  const { category } = useParams();
  const [articles, setArticles] = useState<PublicArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { items: menuItems } = useMenuItems();
  const surfacePath = surfacePathOverride || (category ? `/${category}` : "/articles");

  const menuLabel = useMemo(() => {
    const label = menuItems.find((item) => item.path === surfacePath)?.label;
    if (label) return label;
    if (!category) return "Articles";
    return category
      .split("-")
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ");
  }, [menuItems, surfacePath, category]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublicArticles(1, surfacePath)
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
  }, [surfacePath]);

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
    <div className="public-articles-surface">
      <h1 className="page-title">{menuLabel}</h1>
      <div className="public-article-list-shell">
        <div className="public-article-list-header muted small">
          <span>Title</span>
          <span>Summary</span>
          <span>Action</span>
        </div>
        <div className="public-article-list">
        {articles.map((article) => (
          <article key={article.slug} className="public-article-row">
            <h2>{article.title}</h2>
            <p className="muted">{article.summary || "No summary."}</p>
            <Link className="ghost sm" to={category ? `/${category}/${article.slug}` : `/articles/${article.slug}`}>
              Read article
            </Link>
          </article>
        ))}
        </div>
      </div>
    </div>
  );
}
