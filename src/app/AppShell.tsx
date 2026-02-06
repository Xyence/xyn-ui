import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { getStoredIdToken } from "../api/client";
import BlueprintsPage from "./pages/BlueprintsPage";
import InstancesPage from "./pages/InstancesPage";
import ModulesPage from "./pages/ModulesPage";
import RegistriesPage from "./pages/RegistriesPage";
import ReleasePlansPage from "./pages/ReleasePlansPage";
import ReleasesPage from "./pages/ReleasesPage";
import RunsPage from "./pages/RunsPage";
import ActivityPage from "./pages/ActivityPage";
import DevTasksPage from "./pages/DevTasksPage";
import ContextPacksPage from "./pages/ContextPacksPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import { isOidcConfigured, logout, startLogin } from "./auth/oidc";

export default function AppShell() {
  const [authed, setAuthed] = useState(Boolean(getStoredIdToken()));

  useEffect(() => {
    const onStorage = () => setAuthed(Boolean(getStoredIdToken()));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img className="brand-logo" src="/xyence-logo.png" alt="Xyence logo" />
          <div>
            <h1>Xyn Console</h1>
            <p>Blueprints, registries, and instance management</p>
          </div>
        </div>
        <div className="header-meta">
          {isOidcConfigured() ? (
            authed ? (
              <button className="ghost" onClick={() => logout()}>
                Sign out
              </button>
            ) : (
              <button className="ghost" onClick={() => startLogin(window.location.pathname)}>
                Sign in
              </button>
            )
          ) : (
            <span className="meta-pill">Auth not configured</span>
          )}
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <NavLink
            className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            to="/app/instances"
          >
            Instances
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            to="/app/blueprints"
          >
            Blueprints
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            to="/app/registries"
          >
            Registries
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            to="/app/modules"
          >
            Modules
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            to="/app/release-plans"
          >
            Release Plans
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            to="/app/releases"
          >
            Releases
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            to="/app/runs"
          >
            Runs
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            to="/app/dev-tasks"
          >
            Dev Tasks
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            to="/app/context-packs"
          >
            Context Packs
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            to="/app/activity"
          >
            Activity
          </NavLink>
        </aside>
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="instances" replace />} />
            <Route path="auth/callback" element={<AuthCallbackPage />} />
            <Route path="instances" element={<InstancesPage />} />
            <Route path="blueprints" element={<BlueprintsPage />} />
            <Route path="registries" element={<RegistriesPage />} />
            <Route path="modules" element={<ModulesPage />} />
            <Route path="release-plans" element={<ReleasePlansPage />} />
            <Route path="releases" element={<ReleasesPage />} />
            <Route path="runs" element={<RunsPage />} />
            <Route path="dev-tasks" element={<DevTasksPage />} />
            <Route path="context-packs" element={<ContextPacksPage />} />
            <Route path="activity" element={<ActivityPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
