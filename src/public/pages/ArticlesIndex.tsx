import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPublicArticles } from "../../api/public";
import { useMenuItems } from "../PublicShell";
import type { PublicArticleSummary } from "../types";

export default function ArticlesIndex() {
  const [articles, setArticles] = useState<PublicArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const menuItems = useMenuItems();
  const menuLabel = menuItems.find((item) => item.path === "/articles")?.label;

  useEffect(() => {
    fetchPublicArticles()
      .then((data) => {
        setArticles(data.items || []);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="muted">Loading articles...</p>;
  }

  if (error) {
    return <p className="muted">{error}</p>;
  }

  return (
    <section className="public-section">
      <div className="section-head">
        <h1>{menuLabel || "Articles"}</h1>
      </div>
      <div className="article-grid">
        {articles.map((article) => (
          <article key={article.slug} className="article-card">
            <h3>{article.title}</h3>
            {article.summary && <p>{article.summary}</p>}
            <Link className="ghost" to={`/articles/${article.slug}`}>
              Read article
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
