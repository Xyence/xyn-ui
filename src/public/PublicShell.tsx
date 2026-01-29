import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { checkAuthenticated, fetchPublicMenu, fetchPublicSite } from "../api/public";
import type { MenuItem } from "./types";

const MenuContext = createContext<MenuItem[]>([]);

export function useMenuItems() {
  return useContext(MenuContext);
}

export default function PublicShell() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [siteName, setSiteName] = useState("");
  const location = useLocation();

  useEffect(() => {
    fetchPublicMenu()
      .then((data) => setMenuItems(data.items ?? []))
      .catch(() => setMenuItems([]));
  }, []);

  useEffect(() => {
    fetchPublicSite()
      .then((data) => setSiteName(data.site_name || ""))
      .catch(() => setSiteName(""));
  }, []);

  useEffect(() => {
    checkAuthenticated()
      .then((ok) => setAuthenticated(ok))
      .catch(() => setAuthenticated(false));
  }, []);

  const visibleItems = useMemo(() => {
    return menuItems.filter((item) => (authenticated ? true : !item.requires_auth));
  }, [authenticated, menuItems]);

  return (
    <MenuContext.Provider value={menuItems}>
      <div className="public-shell">
        <header className="public-header">
          <div className="public-nav">
            <Link className="brand-mark" to="/">
              <img src="/xyence-logo.png" alt="Xyence" />
              {siteName && <span className="site-name">{siteName}</span>}
            </Link>
            <nav>
              {visibleItems.map((item) => {
                if (item.kind === "external" && item.external_url) {
                  return (
                    <a key={item.label} href={item.external_url} className="nav-link">
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link key={item.label} to={item.path} className="nav-link">
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {!authenticated && (
              <a className="primary" href={`/admin/login/?next=/app`}>
                Login
              </a>
            )}
          </div>
        </header>
        <main className="public-main" key={location.pathname}>
          <Outlet />
        </main>
        <footer className="public-footer">
          <span>© {new Date().getFullYear()} Xyence</span>
        </footer>
      </div>
    </MenuContext.Provider>
  );
}
