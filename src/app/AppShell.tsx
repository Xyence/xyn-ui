import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";
import { getMe, getMyProfile, getTenantBranding, listArtifactNavSurfaces, listWorkspaces } from "../api/xyn";
import type { ArtifactSurface } from "../api/types";
import { CREATE_ACTIONS, NAV_GROUPS, NAV_MOVE_TOAST_STORAGE_KEY, NavGroup, NavItem, NavUserContext } from "./nav/nav.config";
import { getBreadcrumbs, visibleNav } from "./nav/nav.utils";
import Sidebar from "./components/nav/Sidebar";
import BlueprintsPage from "./pages/BlueprintsPage";
import DraftSessionsPage from "./pages/DraftSessionsPage";
import InstancesPage from "./pages/InstancesPage";
import ModulesPage from "./pages/ModulesPage";
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
import ContextPackDraftEditorPage from "./pages/ContextPackDraftEditorPage";
import PlatformTenantsPage from "./pages/PlatformTenantsPage";
import PlatformBrandingPage from "./pages/PlatformBrandingPage";
import ControlPlanePage from "./pages/ControlPlanePage";
import GuidesPage from "./pages/GuidesPage";
import ToursPage from "./pages/ToursPage";
import TourDetailPage from "./pages/TourDetailPage";
import XynMapPage from "./pages/XynMapPage";
import PlatformSettingsPage from "./pages/PlatformSettingsPage";
import VideoAdapterConfigPage from "./pages/VideoAdapterConfigPage";
import SeedPacksPage from "./pages/SeedPacksPage";
import ArtifactsRegistryPage from "./pages/ArtifactsRegistryPage";
import ArtifactsLibraryPage from "./pages/ArtifactsLibraryPage";
import ArtifactDetailPage from "./pages/ArtifactDetailPage";
import ArtifactSurfaceRoutePage from "./pages/ArtifactSurfaceRoutePage";
import WorkspacesPage from "./pages/WorkspacesPage";
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage";
import DevicesPage from "./pages/DevicesPage";
import InitiatePage from "./pages/InitiatePage";
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
import XynConsoleNode from "./components/console/XynConsoleNode";
import { useXynConsole } from "./state/xynConsoleStore";
import useWorkspaceFromRoute from "./hooks/useWorkspaceFromRoute";
import {
  DEFAULT_WORKSPACE_SUBPATH,
  isWorkspaceScopedPath,
  swapWorkspaceInPath,
  toWorkspacePath,
  toWorkspaceScopedPath,
  withWorkspaceInNavPath,
} from "./routing/workspaceRouting";

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

function RedirectLegacyWorkspaceAccessRoute() {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  currentParams.set("tab", "people_roles");
  return <Navigate to={{ pathname: "/app/workspaces", search: `?${currentParams.toString()}` }} replace />;
}

function RedirectWithNotice({ to, notice }: { to: string; notice: string }) {
  const { push } = useNotifications();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${NAV_MOVE_TOAST_STORAGE_KEY}:${to}`;
    if (!window.sessionStorage.getItem(key)) {
      push({ level: "info", title: "Moved", message: notice });
      window.sessionStorage.setItem(key, "1");
    }
  }, [push, to, notice]);
  return <Navigate to={to} replace />;
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
  const headerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const [authed, setAuthed] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [actorRoles, setActorRoles] = useState<string[]>([]);
  const [authUser, setAuthUser] = useState<Record<string, unknown> | null>(null);
  const [userContext, setUserContext] = useState<{ id?: string; email?: string }>({});
  const [authLoaded, setAuthLoaded] = useState(false);
  const [brandName, setBrandName] = useState<string>("Xyn Console");
  const [brandLogo, setBrandLogo] = useState<string>("/xyence-logo.png");
  const [reportOpen, setReportOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; slug: string; name: string; role: string; termination_authority?: boolean }>>([]);
  const [preferredWorkspaceId, setPreferredWorkspaceId] = useState<string>(() => localStorage.getItem("xyn.activeWorkspaceId") || "");
  const [helpOpen, setHelpOpen] = useState(false);
  const [surfaceNavItems, setSurfaceNavItems] = useState<ArtifactSurface[]>([]);
  const [tourSlug, setTourSlug] = useState<string | null>(null);
  const [tourLaunchToken, setTourLaunchToken] = useState(0);
  const [agentActivityOpen, setAgentActivityOpen] = useState(false);
  const { push } = useNotifications();
  const { runningAiCount } = useOperations();
  const { preview, disablePreviewMode } = usePreview();
  const { handleRouteChange } = useXynConsole();
  const hideFloatingConsoleNode = location.pathname === "/app/console" || location.pathname.includes("/console");
  const workspaceRoute = useWorkspaceFromRoute(workspaces);
  const workspaceIdFromRoute = workspaceRoute.workspaceId;
  const activeWorkspaceId = workspaceIdFromRoute || preferredWorkspaceId;
  const inWorkspaceScope = isWorkspaceScopedPath(location.pathname);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        if (!mounted) return;
        setAuthed(Boolean(me?.user));
        setAuthUser((me?.user as Record<string, unknown>) || null);
        setRoles(me?.roles ?? []);
        setPermissions(me?.permissions ?? []);
        setActorRoles(me?.actor_roles ?? me?.roles ?? []);
        setUserContext({
          id: (me?.user?.subject as string | null) || (me?.user?.sub as string | null) || "",
          email: (me?.user?.email as string | null) || "",
        });
        const meWorkspaces = me?.workspaces || [];
        if (Array.isArray(meWorkspaces) && meWorkspaces.length > 0) {
          setWorkspaces(meWorkspaces);
          setPreferredWorkspaceId((current) => current || meWorkspaces[0].id);
        } else {
          try {
            const ws = await listWorkspaces();
            if (!mounted) return;
            setWorkspaces(ws.workspaces || []);
            setPreferredWorkspaceId((current) => current || ws.workspaces?.[0]?.id || "");
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
        setPermissions([]);
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
    if (!authed) {
      setSurfaceNavItems([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const payload = await listArtifactNavSurfaces(activeWorkspaceId || undefined);
        if (!mounted) return;
        setSurfaceNavItems(payload.surfaces || []);
      } catch {
        if (!mounted) return;
        setSurfaceNavItems([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authed, activeWorkspaceId]);

  useEffect(() => {
    if (activeWorkspaceId) localStorage.setItem("xyn.activeWorkspaceId", activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (workspaceIdFromRoute) {
      setPreferredWorkspaceId(workspaceIdFromRoute);
    }
  }, [workspaceIdFromRoute]);

  useEffect(() => {
    if (!workspaces.length) return;
    const fallbackWorkspaceId = preferredWorkspaceId || workspaces[0]?.id || "";
    if (!fallbackWorkspaceId) return;

    if (inWorkspaceScope) {
      const valid = workspaces.some((workspace) => workspace.id === workspaceIdFromRoute);
      if (!valid) {
        navigate(toWorkspacePath(fallbackWorkspaceId, DEFAULT_WORKSPACE_SUBPATH), { replace: true });
      }
      return;
    }

    const redirected = toWorkspaceScopedPath(location.pathname, fallbackWorkspaceId);
    if (redirected) {
      navigate(
        {
          pathname: redirected,
          search: location.search,
          hash: location.hash,
        },
        { replace: true }
      );
    }
  }, [inWorkspaceScope, location.hash, location.pathname, location.search, navigate, preferredWorkspaceId, workspaceIdFromRoute, workspaces]);

  const startLogin = () => {
    const returnTo = window.location.pathname || "/app";
    window.location.href = `/auth/login?appId=xyn-ui&returnTo=${encodeURIComponent(returnTo)}`;
  };

  const signOut = () =>
    fetch("/auth/logout", { method: "POST", credentials: "include" }).then(() => {
      setAuthed(false);
      setAuthUser(null);
      setPermissions([]);
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

  const navUser: NavUserContext = useMemo(() => ({ roles: effectiveRoles, permissions }), [effectiveRoles, permissions]);
  const navGroups: NavGroup[] = useMemo(() => {
    const mapNavPath = (path: string): string => {
      if (!activeWorkspaceId) return path;
      return withWorkspaceInNavPath(path, activeWorkspaceId);
    };
    const baseGroups = NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items ? group.items.map((item) => ({ ...item, path: mapNavPath(item.path) })) : [],
      subgroups: group.subgroups
        ? group.subgroups.map((subgroup) => ({
            ...subgroup,
            items: subgroup.items.map((item) => ({ ...item, path: mapNavPath(item.path) })),
          }))
        : [],
    }));
    if (!surfaceNavItems.length) return baseGroups;
    const idToGroup = new Map(baseGroups.map((group) => [group.id, group]));
    const pathSeen = new Set<string>();
    baseGroups.forEach((group) => {
      (group.items || []).forEach((item) => pathSeen.add(item.path));
      (group.subgroups || []).forEach((subgroup) => subgroup.items.forEach((item) => pathSeen.add(item.path)));
    });

    surfaceNavItems
      .filter((surface) => String(surface.nav_visibility || "").toLowerCase() === "always")
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .forEach((surface) => {
        const route = String(surface.route || "").trim();
        if (!route || pathSeen.has(route)) return;
        const navGroupHint = String(surface.nav_group || "build").trim().toLowerCase();
        const targetGroup = idToGroup.get(navGroupHint) || idToGroup.get("build");
        if (!targetGroup) return;
        const permissionsSpec = (surface.permissions || {}) as Record<string, unknown>;
        const requiredRoles = Array.isArray(permissionsSpec.required_roles)
          ? permissionsSpec.required_roles.map((entry) => String(entry).trim()).filter(Boolean)
          : [];
        const requiredPermissions = Array.isArray(permissionsSpec.required_permissions)
          ? permissionsSpec.required_permissions.map((entry) => String(entry).trim()).filter(Boolean)
          : [];
        const navItem: NavItem = {
          id: `surface-${surface.id}`,
          label: String(surface.nav_label || surface.title || "Surface"),
          path: mapNavPath(route),
          icon: String(surface.nav_icon || "").trim() || "Sparkles",
          requiredRoles: requiredRoles.length ? requiredRoles : undefined,
          requiredPermissions: requiredPermissions.length ? requiredPermissions : undefined,
        };
        targetGroup.items = [...(targetGroup.items || []), navItem];
        pathSeen.add(route);
      });

    return baseGroups;
  }, [activeWorkspaceId, surfaceNavItems]);
  const createActions = useMemo(
    () =>
      CREATE_ACTIONS.map((action) => ({
        ...action,
        path: activeWorkspaceId ? withWorkspaceInNavPath(action.path, activeWorkspaceId) : action.path,
      })),
    [activeWorkspaceId]
  );
  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0] || null,
    [workspaces, activeWorkspaceId]
  );
  const workspaceRole = activeWorkspace?.role || "reader";
  const canWorkspaceAdmin = workspaceRole === "admin";
  const breadcrumbTrail = useMemo(() => {
    const allowed = visibleNav(navGroups, navUser);
    return getBreadcrumbs(location.pathname, allowed);
  }, [location.pathname, navGroups, navUser]);
  const routeId = useMemo(() => resolveRouteId(location.pathname), [location.pathname]);
  const artifactRouteId = useMemo(() => {
    const match = location.pathname.match(/^\/w\/[^/]+\/build\/artifacts\/([^/]+)/) || location.pathname.match(/^\/app\/artifacts\/([^/]+)/);
    const candidate = match?.[1] || "";
    return /^[0-9a-f-]{36}$/i.test(candidate) ? candidate : "";
  }, [location.pathname]);
  const handleWorkspaceChange = (nextWorkspaceId: string) => {
    if (!nextWorkspaceId) return;
    setPreferredWorkspaceId(nextWorkspaceId);
    if (inWorkspaceScope && isWorkspaceScopedPath(location.pathname)) {
      navigate({
        pathname: swapWorkspaceInPath(location.pathname, nextWorkspaceId),
        search: location.search,
        hash: location.hash,
      });
      return;
    }
    navigate(toWorkspacePath(nextWorkspaceId, DEFAULT_WORKSPACE_SUBPATH));
  };
  const workspaceScopedTarget = (subpath: string): string => {
    if (!activeWorkspace?.id) return "/app/workspaces";
    return toWorkspacePath(activeWorkspace.id, subpath);
  };

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
    handleRouteChange(location.pathname);
  }, [handleRouteChange, location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const updateHeaderHeightVar = () => {
      const height = Math.max(72, Math.round(headerRef.current?.offsetHeight || 88));
      root.style.setProperty("--xyn-header-height", `${height}px`);
    };
    updateHeaderHeightVar();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateHeaderHeightVar);
      return () => {
        window.removeEventListener("resize", updateHeaderHeightVar);
      };
    }
    const observer = new ResizeObserver(updateHeaderHeightVar);
    if (headerRef.current) observer.observe(headerRef.current);
    window.addEventListener("resize", updateHeaderHeightVar);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeaderHeightVar);
    };
  }, []);

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
      <header className="app-header" ref={headerRef}>
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
          navGroups={navGroups}
          createActions={createActions}
          workspaces={workspaces.map((workspace) => ({ id: workspace.id, name: workspace.name }))}
          activeWorkspaceId={activeWorkspace?.id || ""}
          onWorkspaceChange={handleWorkspaceChange}
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
            <Route path="/" element={<Navigate to={inWorkspaceScope ? DEFAULT_WORKSPACE_SUBPATH : "workspaces"} replace />} />
            <Route path="console" element={<InitiatePage />} />
            <Route
              path="a/*"
              element={
                <ArtifactSurfaceRoutePage
                  workspaceId={activeWorkspace?.id || ""}
                  workspaceRole={workspaceRole}
                  canManageArticleLifecycle={isPlatformManager && !isPreviewReadOnly}
                  canCreate={isPlatformManager && !isPreviewReadOnly}
                />
              }
            />
            <Route path="build/artifacts" element={<ArtifactsRegistryPage workspaceId={activeWorkspace?.id || ""} workspaceName={activeWorkspace?.name || ""} workspaceColor={workspaceRoute.workspaceColor} />} />
            <Route path="build/artifacts/library" element={<ArtifactsLibraryPage />} />
            <Route
              path="build/artifacts/:artifactId"
              element={
                <ArtifactDetailPage
                  workspaceId={activeWorkspace?.id || ""}
                  workspaceRole={workspaceRole}
                  canManageArticleLifecycle={isPlatformManager && !isPreviewReadOnly}
                />
              }
            />
            <Route path="build/modules" element={<ModulesPage />} />
            <Route
              path="build/blueprints"
              element={<RedirectWithNotice to={workspaceScopedTarget("build/blueprints/versions")} notice="Blueprints moved to Build / Blueprints / Versions." />}
            />
            <Route path="build/blueprints/drafts" element={<BlueprintsPage mode="drafts" />} />
            <Route path="build/blueprints/versions" element={<BlueprintsPage mode="versions" />} />
            <Route path="build/blueprints/:blueprintId" element={<BlueprintsPage />} />
            <Route
              path="build/drafts"
              element={<RedirectWithNotice to={workspaceScopedTarget("build/blueprints/drafts")} notice="Draft Sessions moved to Build / Blueprints / Drafts." />}
            />
            <Route
              path="build/draft-sessions"
              element={<RedirectWithNotice to={workspaceScopedTarget("build/blueprints/drafts")} notice="Draft Sessions moved to Build / Blueprints / Drafts." />}
            />
            <Route path="build/drafts/:draftId" element={<DraftSessionsPage />} />
            <Route path="build/context-packs" element={<ContextPacksPage />} />
            <Route path="build/context-packs/drafts/:draftId" element={<ContextPackDraftEditorPage />} />
            <Route path="package/release-plans" element={<ReleasePlansPage />} />
            <Route path="package/releases" element={<ReleasesPage />} />
            <Route path="run/instances" element={<InstancesPage />} />
            <Route path="run/runs" element={<RunsPage />} />
            <Route path="govern/activity" element={<ActivityPage workspaceId={activeWorkspace?.id || ""} />} />
            <Route path="govern/contributions" element={<ActivityPage workspaceId={activeWorkspace?.id || ""} defaultTab="contributions" />} />

            <Route path="artifacts" element={<Navigate to={workspaceScopedTarget("build/artifacts")} replace />} />
            <Route
              path="artifacts/articles"
              element={<RedirectWithNotice to={workspaceScopedTarget("a/articles")} notice="Articles moved to Surface route /w/:workspaceId/a/articles." />}
            />
            <Route
              path="artifacts/workflows"
              element={<RedirectWithNotice to={workspaceScopedTarget("a/workflows")} notice="Workflows moved to Surface route /w/:workspaceId/a/workflows." />}
            />
            <Route path="artifacts/all" element={<Navigate to={workspaceScopedTarget("build/artifacts")} replace />} />
            <Route path="artifacts/library" element={<Navigate to={workspaceScopedTarget("build/artifacts/library")} replace />} />
            <Route path="artifacts/:artifactId" element={<Navigate to={workspaceScopedTarget("build/artifacts")} replace />} />
            <Route path="activity" element={<Navigate to={workspaceScopedTarget("govern/activity")} replace />} />
            <Route path="home" element={<Navigate to={workspaceScopedTarget(DEFAULT_WORKSPACE_SUBPATH)} replace />} />
            <Route
              path="workspaces"
              element={
                <WorkspacesPage
                  activeWorkspaceId={activeWorkspace?.id || ""}
                  activeWorkspaceName={activeWorkspace?.name || "Workspace"}
                  canWorkspaceAdmin={canWorkspaceAdmin && !isPreviewReadOnly}
                  canManageWorkspaces={isPlatformAdmin && !isPreviewReadOnly}
                />
              }
            />
            <Route path="people-roles" element={<RedirectLegacyWorkspaceAccessRoute />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="guides" element={<GuidesPage roles={effectiveRoles} />} />
            <Route path="tours" element={<ToursPage />} />
            <Route path="tours/:workflowId" element={<TourDetailPage />} />
            <Route path="map" element={<XynMapPage />} />
            <Route path="blueprints" element={<Navigate to={workspaceScopedTarget("build/blueprints/versions")} replace />} />
            <Route path="blueprints/drafts" element={<Navigate to={workspaceScopedTarget("build/blueprints/drafts")} replace />} />
            <Route path="blueprints/versions" element={<Navigate to={workspaceScopedTarget("build/blueprints/versions")} replace />} />
            <Route path="blueprints/:blueprintId" element={<Navigate to={workspaceScopedTarget("build/blueprints")} replace />} />
            <Route
              path="drafts"
              element={<Navigate to={workspaceScopedTarget("build/drafts")} replace />}
            />
            <Route
              path="draft-sessions"
              element={<Navigate to={workspaceScopedTarget("build/drafts")} replace />}
            />
            <Route path="drafts/:draftId" element={<Navigate to={workspaceScopedTarget("build/drafts")} replace />} />
            <Route path="modules" element={<Navigate to={workspaceScopedTarget("build/modules")} replace />} />
            <Route path="release-plans" element={<Navigate to={workspaceScopedTarget("package/release-plans")} replace />} />
            <Route path="releases" element={<Navigate to={workspaceScopedTarget("package/releases")} replace />} />
            <Route path="instances" element={<Navigate to={workspaceScopedTarget("run/instances")} replace />} />
            <Route path="runs" element={<Navigate to={workspaceScopedTarget("run/runs")} replace />} />
            <Route path="dev-tasks" element={<DevTasksPage />} />
            <Route path="environments" element={<EnvironmentsPage />} />
            <Route path="context-packs" element={<Navigate to={workspaceScopedTarget("build/context-packs")} replace />} />
            <Route path="context-packs/drafts/:draftId" element={<Navigate to={workspaceScopedTarget("build/context-packs")} replace />} />
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
            <Route path="platform/video-adapter-configs/:artifactId" element={<VideoAdapterConfigPage />} />
            <Route path="platform/seeds" element={<SeedPacksPage />} />
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
            <Route path="*" element={<Navigate to={inWorkspaceScope ? DEFAULT_WORKSPACE_SUBPATH : "workspaces"} replace />} />
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
        canRecord={isPlatformManager}
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
      {!hideFloatingConsoleNode ? <XynConsoleNode /> : null}
      <ToastHost />
    </div>
  );
}
