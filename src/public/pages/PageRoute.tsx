import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { fetchPublicPage, fetchPublicPageSections } from "../../api/public";
import { useMenuItems } from "../PublicShell";
import SectionRenderer from "../SectionRenderer";
import type { Page, WebSection } from "../types";

export default function PageRoute() {
  const location = useLocation();
  const menuItems = useMenuItems();
  const [page, setPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<WebSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const match = useMemo(() => {
    return menuItems.find((item) => item.path === location.pathname);
  }, [location.pathname, menuItems]);

  const slug = useMemo(() => {
    if (match?.kind === "page" && match.page_slug) {
      return match.page_slug;
    }
    const trimmed = location.pathname.replace(/^\//, "");
    return trimmed || "home";
  }, [location.pathname, match]);

  useEffect(() => {
    if (!slug || slug === "home") {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([fetchPublicPage(slug), fetchPublicPageSections(slug)])
      .then(([pageData, sectionData]) => {
        if (!active) return;
        setPage(pageData);
        setSections(sectionData.items || []);
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

  if (match?.kind === "articles_index") {
    return <Navigate to="/articles" replace />;
  }

  if (loading) {
    return <p className="muted">Loading...</p>;
  }

  if (error) {
    return <p className="muted">{error}</p>;
  }

  if (!sections.length) {
    return <p className="muted">No sections published.</p>;
  }

  return (
    <div>
      {page?.title && <h1 className="page-title">{page.title}</h1>}
      <SectionRenderer sections={sections} />
    </div>
  );
}
