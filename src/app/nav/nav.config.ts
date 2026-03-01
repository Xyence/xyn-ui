import { ARTIFACT_TYPE_REGISTRY } from "./artifactTypeRegistry";

export type NavVisibility = {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  hiddenRoles?: string[];
};

export type NavItem = NavVisibility & {
  id: string;
  label: string;
  path: string;
  icon?: string;
  keywords?: string[];
};

export type NavSubgroup = NavVisibility & {
  id: string;
  label: string;
  icon?: string;
  items: NavItem[];
};

export type NavGroup = NavVisibility & {
  id: string;
  label: string;
  icon?: string;
  items?: NavItem[];
  subgroups?: NavSubgroup[];
};

export type NavUserContext = {
  roles?: string[];
  permissions?: string[];
};

export type CreateAction = NavVisibility & {
  id: string;
  label: string;
  path: string;
  icon?: string;
};

export const NAV_STATE_STORAGE_KEY = "xyn.nav.state.v1";
export const NAV_MOVE_TOAST_STORAGE_KEY = "xyn.nav.moved-toast.v1";

const NAV_PERMISSION_MAP: Record<string, NavVisibility> = {
  "platform-tenants": { requiredRoles: ["platform_admin"] },
  "platform-access-control": { requiredRoles: ["platform_admin"] },
  "platform-branding": { requiredRoles: ["platform_admin"] },
  "platform-settings": { requiredRoles: ["platform_admin"] },
  "platform-seeds": { requiredRoles: ["platform_admin"] },
  "identity-configuration": { requiredRoles: ["platform_admin"] },
  secrets: { requiredRoles: ["platform_admin"] },
  "ai-agents": { requiredRoles: ["platform_admin", "platform_architect"] },
  "control-plane": { requiredRoles: ["platform_admin", "platform_architect"] },
};

const BUILD_ITEMS = ARTIFACT_TYPE_REGISTRY.filter((entry) => entry.group === "build").sort((a, b) => a.order - b.order);

const buildGroupItems: NavItem[] = [];
const buildGroupSubgroups: NavSubgroup[] = [];
for (const entry of BUILD_ITEMS) {
  if (entry.children?.length) {
    buildGroupSubgroups.push({
      id: entry.key,
      label: entry.display_name,
      icon: entry.icon,
      items: [...entry.children]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((child) => ({
          id: child.key,
          label: child.label,
          path: child.path,
          icon: child.icon,
        })),
    });
    continue;
  }
  buildGroupItems.push({
    id: entry.key,
    label: entry.display_name,
    path: entry.default_route,
    icon: entry.icon,
  });
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    icon: "Compass",
    items: [
      { id: "initiate", label: "Initiate", path: "/app/console", icon: "Sparkles", keywords: ["console", "intent", "start"] },
    ],
  },
  {
    id: "build",
    label: "Build",
    icon: "Hammer",
    items: buildGroupItems,
    subgroups: buildGroupSubgroups,
  },
  {
    id: "package",
    label: "Package",
    icon: "Package",
    items: [
      { id: "release-plans", label: "Release Plans", path: "/app/release-plans", icon: "Route", keywords: ["deploy plan"] },
      { id: "releases", label: "Releases", path: "/app/releases", icon: "PackageCheck", keywords: ["versions"] },
    ],
  },
  {
    id: "run",
    label: "Run",
    icon: "Rocket",
    items: [
      { id: "instances", label: "Instances", path: "/app/instances", icon: "Server", keywords: ["runtime"] },
      { id: "runs", label: "Runs", path: "/app/runs", icon: "PlayCircle", keywords: ["logs", "executions"] },
      { id: "dev-tasks", label: "Dev Tasks", path: "/app/dev-tasks", icon: "ListChecks", keywords: ["queue"] },
      { id: "devices", label: "Devices", path: "/app/devices", icon: "Cpu", keywords: ["ems"] },
      { id: "environments", label: "Environments", path: "/app/environments", icon: "Globe", keywords: ["targets"] },
    ],
  },
  {
    id: "observe",
    label: "Observe",
    icon: "Radar",
    items: [
      { id: "guides", label: "Guides", path: "/app/guides", icon: "BookText", keywords: ["docs", "help"] },
      { id: "tours", label: "Tours", path: "/app/tours", icon: "Route", keywords: ["onboarding", "walkthrough"] },
      { id: "map", label: "Map", path: "/app/map", icon: "Map", keywords: ["overview"] },
    ],
  },
  {
    id: "govern",
    label: "Govern",
    icon: "Scale",
    items: [
      { id: "activity", label: "Activity", path: "/app/activity", icon: "Activity", keywords: ["events", "audit"] },
      { id: "workspaces", label: "Workspaces", path: "/app/workspaces", icon: "Users", keywords: ["membership", "rbac", "workspace"] },
      { id: "platform-access-control", label: "Access Control", path: "/app/platform/access-control", icon: "KeyRound" },
      { id: "identity-configuration", label: "Identity Configuration", path: "/app/platform/identity-configuration", icon: "IdCard" },
      { id: "secrets", label: "Secrets", path: "/app/platform/secrets", icon: "Vault" },
      { id: "ai-agents", label: "AI Agents", path: "/app/platform/ai-agents", icon: "Bot" },
      { id: "platform-branding", label: "Branding", path: "/app/platform/branding", icon: "Palette" },
      { id: "platform-settings", label: "Platform Settings", path: "/app/platform/settings", icon: "SlidersHorizontal" },
      { id: "platform-seeds", label: "Seed Packs", path: "/app/platform/seeds", icon: "Library" },
      { id: "control-plane", label: "Control Plane", path: "/app/control-plane", icon: "ShieldCheck" },
      { id: "platform-tenants", label: "Tenants", path: "/app/platform/tenants", icon: "Building2" },
    ].map((item) => ({ ...item, ...(NAV_PERMISSION_MAP[item.id] || {}) })),
  },
];

export const CREATE_ACTIONS: CreateAction[] = BUILD_ITEMS.flatMap((entry) =>
  entry.create_action
    ? [
        {
          id: entry.create_action.id,
          label: entry.create_action.label,
          path: entry.create_action.path,
          icon: entry.icon,
          requiredRoles: entry.create_action.requiredRoles,
          requiredPermissions: entry.create_action.requiredPermissions,
        },
      ]
    : [],
);
