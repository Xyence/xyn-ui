import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { getMe, getMyProfile, getTenantBranding } from "../api/xyn";
import BlueprintsPage from "./pages/BlueprintsPage";
import InstancesPage from "./pages/InstancesPage";
import ModulesPage from "./pages/ModulesPage";
import RegistriesPage from "./pages/RegistriesPage";
import EnvironmentsPage from "./pages/EnvironmentsPage";
import IdentityProvidersPage from "./pages/IdentityProvidersPage";
import OidcAppClientsPage from "./pages/OidcAppClientsPage";
import SecretStoresPage from "./pages/SecretStoresPage";
import SecretRefsPage from "./pages/SecretRefsPage";
import ReleasePlansPage from "./pages/ReleasePlansPage";
import ReleasesPage from "./pages/ReleasesPage";
import RunsPage from "./pages/RunsPage";
import ActivityPage from "./pages/ActivityPage";
import DevTasksPage from "./pages/DevTasksPage";
import ContextPacksPage from "./pages/ContextPacksPage";
import PlatformTenantsPage from "./pages/PlatformTenantsPage";
import PlatformTenantContactsPage from "./pages/PlatformTenantContactsPage";
import PlatformUsersPage from "./pages/PlatformUsersPage";
import PlatformRolesPage from "./pages/PlatformRolesPage";
import PlatformBrandingPage from "./pages/PlatformBrandingPage";
import MyTenantsPage from "./pages/MyTenantsPage";
import ControlPlanePage from "./pages/ControlPlanePage";
import GuidesPage from "./pages/GuidesPage";
import XynMapPage from "./pages/XynMapPage";

export default function AppShell() {
  const [authed, setAuthed] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [brandName, setBrandName] = useState<string>("Xyn Console");
  const [brandLogo, setBrandLogo] = useState<string>("/xyence-logo.png");
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        if (!mounted) return;
        setAuthed(Boolean(me?.user));
        setRoles(me?.roles ?? []);
        if (me?.user) {
          try {
            const profile = await getMyProfile();
            const membership = profile.memberships?.[0];
            if (membership?.tenant_id) {
              const branding = await getTenantBranding(membership.tenant_id);
              if (!mounted) return;
              setBrandName(branding.display_name || "Xyn Console");
              setBrandLogo(branding.logo_url || "/xyence-logo.png");
              Object.entries(branding.theme || {}).forEach(([key, value]) => {
                if (key) {
                  document.documentElement.style.setProperty(key, value);
                }
              });
            }
          } catch {
            // Silent fallback to defaults.
          }
        }
      } catch {
        if (!mounted) return;
        setAuthed(false);
        setRoles([]);
      } finally {
        if (mounted) {
          setAuthLoaded(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const startLogin = () => {
    const returnTo = window.location.pathname || "/app";
    window.location.href = `/auth/login?appId=xyn-ui&returnTo=${encodeURIComponent(returnTo)}`;
  };

  const isPlatformAdmin = roles.includes("platform_admin");
  const isPlatformArchitect = roles.includes("platform_architect");
  const isPlatformManager = isPlatformAdmin || isPlatformArchitect;

  if (!authLoaded) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            <img className="brand-logo" src="/xyence-logo.png" alt="Xyence logo" />
            <div>
              <h1>{brandName}</h1>
              <p>Loading session…</p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img className="brand-logo" src={brandLogo} alt="Xyence logo" />
          <div>
            <h1>{brandName}</h1>
            <p>Ask boldly.</p>
          </div>
        </div>
        <div className="header-meta">
          {authed ? (
            <button
              className="ghost"
              onClick={() =>
                fetch("/auth/logout", { method: "POST", credentials: "include" }).then(() => setAuthed(false))
              }
            >
              Sign out
            </button>
          ) : (
            <button
              className="ghost"
              onClick={startLogin}
            >
              Sign in
            </button>
          )}
        </div>
      </header>
      <div className="app-body">
        <aside className="app-sidebar">
          {!isPlatformAdmin && (
            <NavLink
              className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
              to="/app/tenants"
            >
              Tenants
            </NavLink>
          )}
          <NavLink
            className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            to="/app/map"
          >
            Map
          </NavLink>
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
          {isPlatformManager && (
            <>
              <div className="nav-section">Platform</div>
              {isPlatformAdmin && (
                <>
                  <NavLink
                    className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                    to="/app/platform/tenants"
                  >
                    Tenants
                  </NavLink>
                  <NavLink
                    className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                    to="/app/platform/users"
                  >
                    Users
                  </NavLink>
                  <NavLink
                    className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                    to="/app/platform/roles"
                  >
                    Roles
                  </NavLink>
                </>
              )}
              <NavLink
                className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                to="/app/platform/environments"
              >
                Environments
              </NavLink>
              <NavLink
                className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                to="/app/platform/control-plane"
              >
                Control Plane
              </NavLink>
              <NavLink
                className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                to="/app/platform/identity-providers"
              >
                Identity Providers
              </NavLink>
              <NavLink
                className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                to="/app/platform/oidc-app-clients"
              >
                OIDC App Clients
              </NavLink>
              {isPlatformAdmin && (
                <>
                  <NavLink
                    className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                    to="/app/platform/secret-stores"
                  >
                    Secret Stores
                  </NavLink>
                  <NavLink
                    className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                    to="/app/platform/secret-refs"
                  >
                    Secret Refs
                  </NavLink>
                </>
              )}
              <NavLink
                className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                to="/app/platform/branding"
              >
                Branding
              </NavLink>
              <NavLink
                className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                to="/app/platform/guides"
              >
                Guides
              </NavLink>
            </>
          )}
        </aside>
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="map" replace />} />
            <Route path="map" element={<XynMapPage />} />
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
            {!isPlatformAdmin && (
              <>
                <Route path="tenants" element={<MyTenantsPage />} />
                <Route path="tenants/:tenantId" element={<PlatformTenantContactsPage />} />
              </>
            )}
            {isPlatformManager && (
              <>
                {isPlatformAdmin && (
                  <>
                    <Route path="platform/tenants" element={<PlatformTenantsPage />} />
                    <Route path="platform/tenants/:tenantId" element={<PlatformTenantContactsPage />} />
                    <Route path="platform/users" element={<PlatformUsersPage />} />
                    <Route path="platform/roles" element={<PlatformRolesPage />} />
                  </>
                )}
                <Route path="platform/environments" element={<EnvironmentsPage />} />
                <Route path="platform/control-plane" element={<ControlPlanePage />} />
                <Route path="platform/identity-providers" element={<IdentityProvidersPage />} />
                <Route path="platform/oidc-app-clients" element={<OidcAppClientsPage />} />
                {isPlatformAdmin && <Route path="platform/secret-stores" element={<SecretStoresPage />} />}
                {isPlatformAdmin && <Route path="platform/secret-refs" element={<SecretRefsPage />} />}
                <Route path="platform/branding" element={<PlatformBrandingPage />} />
                <Route path="platform/guides" element={<GuidesPage />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </div>
  );
}
