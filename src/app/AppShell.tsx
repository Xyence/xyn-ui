import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { getMe, getMyProfile, getTenantBranding, listWorkspaces } from "../api/xyn";
import { NAV_GROUPS, NavUserContext } from "./nav/nav.config";
import { getBreadcrumbs, visibleNav } from "./nav/nav.utils";
import Sidebar from "./components/nav/Sidebar";
import BlueprintsPage from "./pages/BlueprintsPage";
import DraftSessionsPage from "./pages/DraftSessionsPage";
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
import PlatformSettingsPage from "./pages/PlatformSettingsPage";
import WorkspaceHomePage from "./pages/WorkspaceHomePage";
import ArtifactsPage from "./pages/ArtifactsPage";
import ArtifactDetailPage from "./pages/ArtifactDetailPage";
import PeopleRolesPage from "./pages/PeopleRolesPage";
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage";
import DevicesPage from "./pages/DevicesPage";
import { useGlobalHotkeys } from "./hooks/useGlobalHotkeys";
import ReportOverlay from "./components/ReportOverlay";
import UserMenu from "./components/common/UserMenu";
import NotificationBell from "./components/notifications/NotificationBell";
import ToastHost from "./components/notifications/ToastHost";
import { useNotifications } from "./state/notificationsStore";
import HelpDrawer from "./components/help/HelpDrawer";
import TourOverlay from "./components/help/TourOverlay";
import { resolveRouteId } from "./help/routeHelp";

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLElement | null>(null);
  const [authed, setAuthed] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [authUser, setAuthUser] = useState<Record<string, unknown> | null>(null);
  const [userContext, setUserContext] = useState<{ id?: string; email?: string }>({});
  const [authLoaded, setAuthLoaded] = useState(false);
  const [brandName, setBrandName] = useState<string>("Xyn Console");
  const [brandLogo, setBrandLogo] = useState<string>("/xyence-logo.png");
  const [reportOpen, setReportOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; slug: string; name: string; role: string; termination_authority?: boolean }>>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => localStorage.getItem("xyn.activeWorkspaceId") || "");
  const [helpOpen, setHelpOpen] = useState(false);
  const [tourSlug, setTourSlug] = useState<string | null>(null);
  const [tourLaunchToken, setTourLaunchToken] = useState(0);
  const { push } = useNotifications();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        if (!mounted) return;
        setAuthed(Boolean(me?.user));
        setAuthUser((me?.user as Record<string, unknown>) || null);
        setRoles(me?.roles ?? []);
        setUserContext({
          id: (me?.user?.subject as string | null) || (me?.user?.sub as string | null) || "",
          email: (me?.user?.email as string | null) || "",
        });
        const meWorkspaces = me?.workspaces || [];
        if (Array.isArray(meWorkspaces) && meWorkspaces.length > 0) {
          setWorkspaces(meWorkspaces);
          setActiveWorkspaceId((current) => current || meWorkspaces[0].id);
        } else {
          try {
            const ws = await listWorkspaces();
            if (!mounted) return;
            setWorkspaces(ws.workspaces || []);
            setActiveWorkspaceId((current) => current || ws.workspaces?.[0]?.id || "");
          } catch {
            // Keep empty workspaces in bootstrap errors.
          }
        }
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
        setAuthUser(null);
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

  useEffect(() => {
    if (activeWorkspaceId) localStorage.setItem("xyn.activeWorkspaceId", activeWorkspaceId);
  }, [activeWorkspaceId]);

  const startLogin = () => {
    const returnTo = window.location.pathname || "/app";
    window.location.href = `/auth/login?appId=xyn-ui&returnTo=${encodeURIComponent(returnTo)}`;
  };

  const signOut = () =>
    fetch("/auth/logout", { method: "POST", credentials: "include" }).then(() => {
      setAuthed(false);
      setAuthUser(null);
    });

  const isPlatformAdmin = roles.includes("platform_admin");
  const isPlatformArchitect = roles.includes("platform_architect");
  const isPlatformManager = isPlatformAdmin || isPlatformArchitect;

  const navUser: NavUserContext = useMemo(() => ({ roles, permissions: [] }), [roles]);
  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0] || null,
    [workspaces, activeWorkspaceId]
  );
  const workspaceRole = activeWorkspace?.role || "reader";
  const canWorkspaceAdmin = workspaceRole === "admin";
  const breadcrumbTrail = useMemo(() => {
    const allowed = visibleNav(NAV_GROUPS, navUser);
    return getBreadcrumbs(location.pathname, allowed);
  }, [location.pathname, navUser]);
  const routeId = useMemo(() => resolveRouteId(location.pathname), [location.pathname]);

  useGlobalHotkeys((event) => {
    const target = event.target as HTMLElement | null;
    const targetTag = (target?.tagName || "").toLowerCase();
    const typingTarget = targetTag === "input" || targetTag === "textarea" || targetTag === "select" || target?.isContentEditable;
    if (!typingTarget && event.key === "?") {
      event.preventDefault();
      setHelpOpen((prev) => !prev);
      return;
    }
    const metaOrCtrl = event.metaKey || event.ctrlKey;
    if (!metaOrCtrl || !event.shiftKey) return;
    if (event.key.toLowerCase() !== "b") return;
    event.preventDefault();
    setReportOpen(true);
  });

  useEffect(() => {
    const onStartTour = (event: Event) => {
      const detail = (event as CustomEvent<{ slug?: string }>).detail || {};
      const slug = detail.slug || "deploy-subscriber-notes";
      setTourSlug(slug);
      setTourLaunchToken((value) => value + 1);
    };
    window.addEventListener("xyn:start-tour", onStartTour as EventListener);
    return () => window.removeEventListener("xyn:start-tour", onStartTour as EventListener);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!authLoaded || authed) return;
    const returnTo = `${location.pathname}${location.search || ""}` || "/app";
    window.location.href = `/auth/login?appId=xyn-ui&returnTo=${encodeURIComponent(returnTo)}`;
  }, [authLoaded, authed, location.pathname, location.search]);

  if (!authLoaded) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            <img className="brand-logo" src="/xyence-logo.png" alt="Xyence logo" />
            <div>
              <h1>{brandName}</h1>
              <p>Loading session...</p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            <img className="brand-logo" src="/xyence-logo.png" alt="Xyence logo" />
            <div>
              <h1>{brandName}</h1>
              <p>Redirecting to sign in...</p>
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
            <p>Create boldly.</p>
          </div>
        </div>
        <div className="header-meta">
          {authed ? (
            <>
              <NotificationBell />
              <UserMenu user={authUser || {}} onReport={() => setReportOpen(true)} onSignOut={signOut} />
            </>
          ) : (
            <button className="ghost" onClick={startLogin}>
              Sign in
            </button>
          )}
        </div>
      </header>
      <div className="app-body">
        <Sidebar
          user={navUser}
          workspaces={workspaces.map((workspace) => ({ id: workspace.id, name: workspace.name }))}
          activeWorkspaceId={activeWorkspace?.id || ""}
          onWorkspaceChange={setActiveWorkspaceId}
        />
        <main className="app-content" ref={contentRef}>
          {breadcrumbTrail.length > 0 && (
            <div className="app-breadcrumbs" aria-label="Breadcrumb">
              {breadcrumbTrail.map((crumb) => crumb.label).join(" / ")}
            </div>
          )}
          <Routes>
            <Route path="/" element={<Navigate to="home" replace />} />
            <Route path="home" element={<WorkspaceHomePage workspaceName={activeWorkspace?.name || "Workspace"} />} />
            <Route path="artifacts" element={<ArtifactsPage workspaceId={activeWorkspace?.id || ""} />} />
            <Route
              path="artifacts/:artifactId"
              element={<ArtifactDetailPage workspaceId={activeWorkspace?.id || ""} workspaceRole={workspaceRole} />}
            />
            <Route path="activity" element={<ActivityPage workspaceId={activeWorkspace?.id || ""} />} />
            <Route
              path="people-roles"
              element={<PeopleRolesPage workspaceId={activeWorkspace?.id || ""} canAdmin={canWorkspaceAdmin} />}
            />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="guides" element={<GuidesPage roles={roles} />} />
            <Route path="map" element={<XynMapPage />} />
            <Route path="blueprints" element={<BlueprintsPage />} />
            <Route path="drafts" element={<DraftSessionsPage />} />
            <Route path="modules" element={<ModulesPage />} />
            <Route path="release-plans" element={<ReleasePlansPage />} />
            <Route path="releases" element={<ReleasesPage />} />
            <Route path="instances" element={<InstancesPage />} />
            <Route path="runs" element={<RunsPage />} />
            <Route path="dev-tasks" element={<DevTasksPage />} />
            <Route path="environments" element={<EnvironmentsPage />} />
            <Route path="registries" element={<RegistriesPage />} />
            <Route path="context-packs" element={<ContextPacksPage />} />
            <Route path="my-tenants" element={<MyTenantsPage />} />
            <Route path="control-plane" element={<ControlPlanePage />} />
            <Route path="platform/tenants" element={<PlatformTenantsPage />} />
            <Route path="platform/tenant-contacts" element={<PlatformTenantContactsPage />} />
            <Route path="platform/users" element={<PlatformUsersPage />} />
            <Route path="platform/roles" element={<PlatformRolesPage />} />
            <Route path="platform/branding" element={<PlatformBrandingPage />} />
            <Route path="platform/settings" element={<PlatformSettingsPage />} />
            <Route path="platform/identity-providers" element={<IdentityProvidersPage />} />
            <Route path="platform/oidc-app-clients" element={<OidcAppClientsPage />} />
            <Route path="platform/secret-stores" element={<SecretStoresPage />} />
            <Route path="platform/secret-refs" element={<SecretRefsPage />} />
            <Route path="settings" element={<WorkspaceSettingsPage workspaceName={activeWorkspace?.name || "Workspace"} />} />
            <Route path="*" element={<Navigate to="home" replace />} />
          </Routes>
        </main>
      </div>
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        routeId={routeId}
        workspaceId={activeWorkspace?.id || ""}
        roles={roles}
        onStartTour={(slug) => {
          setTourSlug(slug);
          setTourLaunchToken((value) => value + 1);
        }}
      />
      <TourOverlay
        userKey={userContext.id || userContext.email || "anon"}
        launchSlug={tourSlug}
        launchToken={tourLaunchToken}
        currentPath={location.pathname}
        navigateTo={(path) => navigate(path)}
        onClose={() => setTourSlug(null)}
      />
      <ReportOverlay
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        user={userContext}
        onSubmitted={(reportId) =>
          push({
            level: "success",
            title: "Report submitted",
            message: reportId,
            action: "report.create",
            entityType: "unknown",
            entityId: reportId,
            status: "succeeded",
            dedupeKey: `report:${reportId}`,
          })
        }
      />
      <ToastHost />
    </div>
  );
}
