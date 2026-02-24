import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";
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
import SecretConfigurationPage from "./pages/SecretConfigurationPage";
import AIConfigPage from "./pages/AIConfigPage";
import IdentityConfigurationPage from "./pages/IdentityConfigurationPage";
import AccessControlPage from "./pages/AccessControlPage";
import ReleasePlansPage from "./pages/ReleasePlansPage";
import ReleasesPage from "./pages/ReleasesPage";
import RunsPage from "./pages/RunsPage";
import ActivityPage from "./pages/ActivityPage";
import DevTasksPage from "./pages/DevTasksPage";
import ContextPacksPage from "./pages/ContextPacksPage";
import PlatformTenantsPage from "./pages/PlatformTenantsPage";
import PlatformBrandingPage from "./pages/PlatformBrandingPage";
import ControlPlanePage from "./pages/ControlPlanePage";
import GuidesPage from "./pages/GuidesPage";
import ToursPage from "./pages/ToursPage";
import XynMapPage from "./pages/XynMapPage";
import PlatformSettingsPage from "./pages/PlatformSettingsPage";
import WorkspaceHomePage from "./pages/WorkspaceHomePage";
import ArtifactsArticlesPage from "./pages/ArtifactsArticlesPage";
import ArtifactsRegistryPage from "./pages/ArtifactsRegistryPage";
import ArtifactDetailPage from "./pages/ArtifactDetailPage";
import PeopleRolesPage from "./pages/PeopleRolesPage";
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage";
import DevicesPage from "./pages/DevicesPage";
import { useGlobalHotkeys } from "./hooks/useGlobalHotkeys";
import ReportOverlay from "./components/ReportOverlay";
import UserMenu from "./components/common/UserMenu";
import NotificationBell from "./components/notifications/NotificationBell";
import ToastHost from "./components/notifications/ToastHost";
import AgentActivityDrawer from "./components/activity/AgentActivityDrawer";
import { useNotifications } from "./state/notificationsStore";
import { useOperations } from "./state/operationRegistry";
import { usePreview } from "./state/previewStore";
import HelpDrawer from "./components/help/HelpDrawer";
import TourOverlay from "./components/help/TourOverlay";
import { resolveRouteId } from "./help/routeHelp";
import HeaderPreviewControl from "./components/preview/HeaderPreviewControl";
import PreviewBanner from "./components/preview/PreviewBanner";

function RedirectLegacyAiRoute({ tab }: { tab: "credentials" | "model-configs" | "agents" | "purposes" }) {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  currentParams.set("tab", tab);
  return <Navigate to={{ pathname: "/app/platform/ai-agents", search: `?${currentParams.toString()}` }} replace />;
}

function RedirectLegacySecretsRoute({ tab }: { tab: "stores" | "refs" }) {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  currentParams.set("tab", tab);
  return <Navigate to={{ pathname: "/app/platform/secrets", search: `?${currentParams.toString()}` }} replace />;
}

function RedirectLegacyIdentityRoute({ tab }: { tab: "identity-providers" | "oidc-app-clients" }) {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  currentParams.set("tab", tab);
  return <Navigate to={{ pathname: "/app/platform/identity-configuration", search: `?${currentParams.toString()}` }} replace />;
}

function RedirectLegacyTenantsRoute({ view }: { view: "all" | "my" }) {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  if (view === "my") currentParams.set("view", "my");
  else currentParams.delete("view");
  return <Navigate to={{ pathname: "/app/platform/tenants", search: `?${currentParams.toString()}` }} replace />;
}

function RedirectLegacyAccessControlRoute({ tab }: { tab: "roles" | "users" | "explorer" }) {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  currentParams.set("tab", tab);
  return <Navigate to={{ pathname: "/app/platform/access-control", search: `?${currentParams.toString()}` }} replace />;
}

function RedirectLegacyTenantContactsDetailRoute() {
  const { pathname, search } = useLocation();
  const match = pathname.match(/\/app\/platform\/tenant-contacts\/([^/?#]+)/);
  const tenantId = match?.[1] || "";
  const currentParams = new URLSearchParams(search);
  currentParams.set("tab", "contacts");
  const searchString = currentParams.toString();
  const destination = tenantId ? `/app/platform/tenants/${tenantId}` : "/app/platform/tenants";
  return <Navigate to={{ pathname: destination, search: searchString ? `?${searchString}` : "" }} replace />;
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLElement | null>(null);
  const [authed, setAuthed] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [actorRoles, setActorRoles] = useState<string[]>([]);
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
  const [agentActivityOpen, setAgentActivityOpen] = useState(false);
  const { push } = useNotifications();
  const { runningAiCount } = useOperations();
  const { preview, disablePreviewMode } = usePreview();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        if (!mounted) return;
        setAuthed(Boolean(me?.user));
        setAuthUser((me?.user as Record<string, unknown>) || null);
        setRoles(me?.roles ?? []);
        setActorRoles(me?.actor_roles ?? me?.roles ?? []);
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
        setActorRoles([]);
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

  const effectiveRoles = useMemo(() => {
    if (preview.enabled) {
      if (preview.effective_roles && preview.effective_roles.length > 0) return preview.effective_roles;
      if (preview.roles && preview.roles.length > 0) return preview.roles;
    }
    return roles;
  }, [preview.enabled, preview.effective_roles, preview.roles, roles]);
  const isPreviewReadOnly = Boolean(preview.enabled && preview.read_only);

  const isPlatformAdmin = effectiveRoles.includes("platform_admin") || effectiveRoles.includes("platform_owner");
  const isPlatformArchitect = effectiveRoles.includes("platform_architect");
  const isPlatformManager = isPlatformAdmin || isPlatformArchitect;

  const navUser: NavUserContext = useMemo(() => ({ roles: effectiveRoles, permissions: [] }), [effectiveRoles]);
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
  const artifactRouteId = useMemo(() => {
    const match = location.pathname.match(/^\/app\/artifacts\/([^/]+)/);
    const candidate = match?.[1] || "";
    return /^[0-9a-f-]{36}$/i.test(candidate) ? candidate : "";
  }, [location.pathname]);

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
    const hotkey = event.key.toLowerCase();
    if (hotkey === "a") {
      event.preventDefault();
      setAgentActivityOpen((prev) => !prev);
      return;
    }
    if (hotkey === "b") {
      event.preventDefault();
      setReportOpen(true);
    }
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

  useEffect(() => {
    const onReadOnly = () => {
      push({
        level: "warning",
        title: "Preview mode is read-only",
        message: "Exit preview to perform this action.",
      });
    };
    window.addEventListener("xyn:preview-read-only", onReadOnly as EventListener);
    return () => window.removeEventListener("xyn:preview-read-only", onReadOnly as EventListener);
  }, [push]);

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
              <HeaderPreviewControl
                actorRoles={actorRoles}
                actorLabel={String(authUser?.email || authUser?.display_name || authUser?.subject || "current user")}
                onMessage={({ level, title, message }) => push({ level, title, message })}
              />
              <button
                type="button"
                className={`ghost notification-bell agent-indicator ${runningAiCount > 0 ? "thinking" : ""}`}
                aria-label={runningAiCount > 0 ? `Agent activity, ${runningAiCount} AI operation in progress` : "Agent activity"}
                onClick={() => setAgentActivityOpen((prev) => !prev)}
              >
                <Bot size={16} />
                {runningAiCount > 0 && <span className="agent-indicator-dot" aria-hidden="true" />}
                <span className="sr-only" aria-live="polite">
                  {runningAiCount > 0 ? "AI operation in progress" : "No AI operations in progress"}
                </span>
              </button>
              <UserMenu
                user={authUser || {}}
                onReport={() => setReportOpen(true)}
                onAgentActivity={() => setAgentActivityOpen(true)}
                onSignOut={signOut}
              />
              {runningAiCount > 0 && <span className="agent-thinking-label">Thinking…</span>}
            </>
          ) : (
            <button className="ghost" onClick={startLogin}>
              Sign in
            </button>
          )}
        </div>
      </header>
      <div className={`app-body ${isPreviewReadOnly ? "preview-readonly" : ""}`}>
        <Sidebar
          user={navUser}
          workspaces={workspaces.map((workspace) => ({ id: workspace.id, name: workspace.name }))}
          activeWorkspaceId={activeWorkspace?.id || ""}
          onWorkspaceChange={setActiveWorkspaceId}
        />
        <main className="app-content" ref={contentRef}>
          <div className={`preview-banner-slot ${preview.enabled ? "active" : ""}`}>
            <PreviewBanner
              actorLabel={String(authUser?.email || authUser?.display_name || authUser?.subject || "current user")}
              onExit={async () => {
                await disablePreviewMode();
                push({ level: "success", title: "Preview ended" });
              }}
            />
          </div>
          {breadcrumbTrail.length > 0 && (
            <div className="app-breadcrumbs" aria-label="Breadcrumb">
              {breadcrumbTrail.map((crumb) => crumb.label).join(" / ")}
            </div>
          )}
          <Routes>
            <Route path="/" element={<Navigate to="home" replace />} />
            <Route path="home" element={<WorkspaceHomePage workspaceName={activeWorkspace?.name || "Workspace"} />} />
            <Route path="artifacts" element={<Navigate to="/app/artifacts/articles" replace />} />
            <Route
              path="artifacts/articles"
              element={<ArtifactsArticlesPage workspaceId={activeWorkspace?.id || ""} canCreate={isPlatformManager && !isPreviewReadOnly} />}
            />
            <Route path="artifacts/all" element={<ArtifactsRegistryPage workspaceId={activeWorkspace?.id || ""} />} />
            <Route
              path="artifacts/:artifactId"
              element={
                <ArtifactDetailPage
                  workspaceId={activeWorkspace?.id || ""}
                  workspaceRole={workspaceRole}
                  canManageArticleLifecycle={isPlatformManager && !isPreviewReadOnly}
                />
              }
            />
            <Route path="activity" element={<ActivityPage workspaceId={activeWorkspace?.id || ""} />} />
            <Route
              path="people-roles"
              element={<PeopleRolesPage workspaceId={activeWorkspace?.id || ""} canAdmin={canWorkspaceAdmin && !isPreviewReadOnly} />}
            />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="guides" element={<GuidesPage roles={effectiveRoles} />} />
            <Route path="tours" element={<ToursPage />} />
            <Route path="map" element={<XynMapPage />} />
            <Route path="blueprints" element={<BlueprintsPage />} />
            <Route path="drafts" element={<DraftSessionsPage />} />
            <Route path="drafts/:draftId" element={<DraftSessionsPage />} />
            <Route path="modules" element={<ModulesPage />} />
            <Route path="release-plans" element={<ReleasePlansPage />} />
            <Route path="releases" element={<ReleasesPage />} />
            <Route path="instances" element={<InstancesPage />} />
            <Route path="runs" element={<RunsPage />} />
            <Route path="dev-tasks" element={<DevTasksPage />} />
            <Route path="environments" element={<EnvironmentsPage />} />
            <Route path="registries" element={<RegistriesPage />} />
            <Route path="context-packs" element={<ContextPacksPage />} />
            <Route path="my-tenants" element={<RedirectLegacyTenantsRoute view="my" />} />
            <Route path="control-plane" element={<ControlPlanePage />} />
            <Route path="platform/tenants" element={<PlatformTenantsPage />} />
            <Route path="platform/tenants/:tenantId" element={<PlatformTenantsPage />} />
            <Route path="platform/tenant-contacts" element={<RedirectLegacyTenantsRoute view="all" />} />
            <Route path="platform/tenant-contacts/:tenantId" element={<RedirectLegacyTenantContactsDetailRoute />} />
            <Route path="platform/access-control" element={<AccessControlPage />} />
            <Route path="platform/access-explorer" element={<RedirectLegacyAccessControlRoute tab="explorer" />} />
            <Route path="platform/users" element={<RedirectLegacyAccessControlRoute tab="users" />} />
            <Route path="platform/roles" element={<RedirectLegacyAccessControlRoute tab="roles" />} />
            <Route path="platform/branding" element={<PlatformBrandingPage />} />
            <Route path="platform/settings" element={<PlatformSettingsPage />} />
            <Route path="platform/identity-configuration" element={<IdentityConfigurationPage />} />
            <Route path="platform/identity-providers" element={<RedirectLegacyIdentityRoute tab="identity-providers" />} />
            <Route path="platform/oidc-app-clients" element={<RedirectLegacyIdentityRoute tab="oidc-app-clients" />} />
            <Route path="platform/secrets" element={<SecretConfigurationPage />} />
            <Route path="platform/secret-stores" element={<RedirectLegacySecretsRoute tab="stores" />} />
            <Route path="platform/secret-refs" element={<RedirectLegacySecretsRoute tab="refs" />} />
            <Route path="platform/ai-config" element={<Navigate to="/app/platform/ai-agents" replace />} />
            <Route path="platform/ai-configuration" element={<Navigate to="/app/platform/ai-agents" replace />} />
            <Route path="platform/ai-agents" element={<AIConfigPage />} />
            <Route path="platform/ai/credentials" element={<RedirectLegacyAiRoute tab="credentials" />} />
            <Route path="platform/ai/model-configs" element={<RedirectLegacyAiRoute tab="model-configs" />} />
            <Route path="platform/ai/agents" element={<RedirectLegacyAiRoute tab="agents" />} />
            <Route path="platform/ai/purposes" element={<RedirectLegacyAiRoute tab="purposes" />} />
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
        roles={effectiveRoles}
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
      <AgentActivityDrawer
        open={agentActivityOpen}
        onClose={() => setAgentActivityOpen(false)}
        workspaceId={activeWorkspace?.id || ""}
        artifactId={artifactRouteId || undefined}
      />
      <ToastHost />
    </div>
  );
}
