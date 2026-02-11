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
import MyTenantsPage from "./pages/MyTenantsPage";

export default function AppShell() {
  const [authed, setAuthed] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [brandName, setBrandName] = useState<string>("Xyn Console");
  const [brandLogo, setBrandLogo] = useState<string>("/xyence-logo.png");
  const [oidcFallback, setOidcFallback] = useState(false);
  const [authProviders, setAuthProviders] = useState<Array<{ id: string; display_name: string }>>([]);
  const [showAuthPicker, setShowAuthPicker] = useState(false);

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

  const startLogin = async () => {
    try {
      const response = await fetch("/xyn/api/auth/oidc/config?appId=xyn-ui", {
        credentials: "include",
      });
      if (!response.ok) {
        setOidcFallback(true);
        window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      setOidcFallback(false);
      const payload = await response.json();
      const providers = (payload.allowed_providers || []).map((provider: any) => ({
        id: provider.id,
        display_name: provider.display_name || provider.id,
      }));
      if (providers.length <= 1) {
        const provider = providers[0];
        if (!provider) {
          window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        window.location.href = `/xyn/api/auth/oidc/${provider.id}/authorize?appId=xyn-ui&next=${encodeURIComponent(
          window.location.pathname
        )}`;
        return;
      }
      setAuthProviders(providers);
      setShowAuthPicker(true);
    } catch {
      setOidcFallback(true);
      window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
  };

  const isPlatformAdmin = roles.includes("platform_admin");

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
            <p>Blueprints, registries, and instance management</p>
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
      {!authed && showAuthPicker && authProviders.length > 1 && (
        <div className="signin-picker">
          <strong>Choose a provider</strong>
          <div className="signin-picker-actions">
            {authProviders.map((provider) => (
              <button
                key={provider.id}
                className="ghost"
                onClick={() =>
                  (window.location.href = `/xyn/api/auth/oidc/${provider.id}/authorize?appId=xyn-ui&next=${encodeURIComponent(
                    window.location.pathname
                  )}`)
                }
              >
                Continue with {provider.display_name}
              </button>
            ))}
            <button className="ghost" onClick={() => setShowAuthPicker(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {!authed && oidcFallback && (
        <div className="inline-message inline-warn">
          <strong>Using ENV OIDC fallback (no app client configured)</strong>
          <span className="muted">Seed an app client to switch to DB-managed providers.</span>
        </div>
      )}

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
          {isPlatformAdmin && (
            <>
              <div className="nav-section">Platform</div>
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
              <NavLink
                className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
                to="/app/platform/environments"
              >
                Environments
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
            </>
          )}
        </aside>
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="instances" replace />} />
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
            {isPlatformAdmin && (
              <>
                <Route path="platform/tenants" element={<PlatformTenantsPage />} />
                <Route path="platform/tenants/:tenantId" element={<PlatformTenantContactsPage />} />
                <Route path="platform/users" element={<PlatformUsersPage />} />
                <Route path="platform/roles" element={<PlatformRolesPage />} />
                <Route path="platform/environments" element={<EnvironmentsPage />} />
                <Route path="platform/identity-providers" element={<IdentityProvidersPage />} />
                <Route path="platform/oidc-app-clients" element={<OidcAppClientsPage />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </div>
  );
}
