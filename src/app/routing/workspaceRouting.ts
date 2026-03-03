export const DEFAULT_WORKSPACE_SUBPATH = "workbench";

const LEGACY_SCOPED_PREFIXES = [
  "/app/artifacts",
  "/app/blueprints",
  "/app/drafts",
  "/app/draft-sessions",
  "/app/modules",
  "/app/context-packs",
  "/app/release-plans",
  "/app/releases",
  "/app/instances",
  "/app/runs",
  "/app/activity",
  "/app/govern/contributions",
  "/app/settings",
  "/app/catalog",
  "/app/platform/settings",
  "/app/a/",
];

const LEGACY_EXACT_TO_SUBPATH: Record<string, string> = {
  "/app": DEFAULT_WORKSPACE_SUBPATH,
  "/app/": DEFAULT_WORKSPACE_SUBPATH,
  "/app/home": DEFAULT_WORKSPACE_SUBPATH,
  "/app/workbench": DEFAULT_WORKSPACE_SUBPATH,
  "/app/console": "console",
  "/app/initiate": "console",
  "/app/artifacts/all": "build/artifacts",
  "/app/artifacts/library": "build/catalog",
  "/app/catalog": "build/catalog",
  "/app/modules": "build/modules",
  "/app/context-packs": "build/context-packs",
  "/app/release-plans": "package/release-plans",
  "/app/releases": "package/releases",
  "/app/instances": "run/instances",
  "/app/runs": "run/runs",
  "/app/activity": "govern/activity",
  "/app/govern/contributions": "govern/contributions",
  "/app/settings": "settings",
  "/app/platform/settings": "platform/settings",
};

export function toWorkspacePath(workspaceId: string, subpath: string): string {
  const token = String(workspaceId || "").trim();
  const rest = String(subpath || "").replace(/^\/+/, "");
  if (!token) return `/w//${rest}`;
  if (!rest) return `/w/${encodeURIComponent(token)}`;
  return `/w/${encodeURIComponent(token)}/${rest}`;
}

export function isWorkspaceScopedPath(pathname: string): boolean {
  return /^\/w\/[^/]+(?:\/|$)/.test(pathname);
}

export function swapWorkspaceInPath(pathname: string, workspaceId: string): string {
  const target = encodeURIComponent(String(workspaceId || "").trim());
  if (!target) return pathname;
  if (!isWorkspaceScopedPath(pathname)) return pathname;
  return pathname.replace(/^\/w\/[^/]+/, `/w/${target}`);
}

export function toWorkspaceScopedPath(pathname: string, workspaceId: string): string | null {
  const normalized = String(pathname || "").trim() || "/app";
  const exact = LEGACY_EXACT_TO_SUBPATH[normalized];
  if (exact) return toWorkspacePath(workspaceId, exact);

  for (const prefix of LEGACY_SCOPED_PREFIXES) {
    if (!normalized.startsWith(prefix)) continue;
    if (prefix === "/app/a/") {
      return toWorkspacePath(workspaceId, normalized.replace(/^\/app\//, ""));
    }
    const suffix = normalized.replace(prefix, "").replace(/^\/+/, "");
    if (prefix === "/app/artifacts") {
      if (suffix.startsWith("library")) return toWorkspacePath(workspaceId, `build/artifacts/${suffix}`);
      if (suffix.startsWith("all")) return toWorkspacePath(workspaceId, `build/artifacts/${suffix.replace(/^all\/?/, "")}`.replace(/\/$/, ""));
      if (/^[0-9a-f-]{36}$/i.test(suffix)) return toWorkspacePath(workspaceId, `build/artifacts/${suffix}`);
      return toWorkspacePath(workspaceId, "build/artifacts");
    }
    if (prefix === "/app/blueprints") return toWorkspacePath(workspaceId, `build/blueprints${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/drafts" || prefix === "/app/draft-sessions") return toWorkspacePath(workspaceId, `build/drafts${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/modules") return toWorkspacePath(workspaceId, `build/modules${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/context-packs") return toWorkspacePath(workspaceId, `build/context-packs${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/release-plans") return toWorkspacePath(workspaceId, `package/release-plans${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/releases") return toWorkspacePath(workspaceId, `package/releases${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/instances") return toWorkspacePath(workspaceId, `run/instances${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/runs") return toWorkspacePath(workspaceId, `run/runs${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/activity") return toWorkspacePath(workspaceId, `govern/activity${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/govern/contributions") return toWorkspacePath(workspaceId, `govern/contributions${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/settings") return toWorkspacePath(workspaceId, `settings${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/catalog") return toWorkspacePath(workspaceId, `build/catalog${suffix ? `/${suffix}` : ""}`);
    if (prefix === "/app/platform/settings") return toWorkspacePath(workspaceId, `platform/settings${suffix ? `/${suffix}` : ""}`);
  }

  return null;
}

export function withWorkspaceInNavPath(path: string, workspaceId: string): string {
  if (!path.startsWith("/app/")) return path;
  const converted = toWorkspaceScopedPath(path, workspaceId);
  return converted || path;
}
