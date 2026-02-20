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

export const NAV_STATE_STORAGE_KEY = "xyn.nav.state.v1";

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    icon: "Compass",
    items: [{ id: "home", label: "Home", path: "/app/home", icon: "Compass", keywords: ["overview", "workspace"] }],
  },
  {
    id: "artifacts",
    label: "Artifacts",
    icon: "BookOpen",
    items: [{ id: "artifacts", label: "Artifacts", path: "/app/artifacts", icon: "BookOpen", keywords: ["articles", "registry"] }],
  },
  {
    id: "activity",
    label: "Activity",
    icon: "Activity",
    items: [{ id: "activity", label: "Activity", path: "/app/activity", icon: "Activity", keywords: ["events", "audit"] }],
  },
  {
    id: "people-roles",
    label: "People & Roles",
    icon: "Users",
    items: [{ id: "people-roles", label: "People & Roles", path: "/app/people-roles", icon: "Users", keywords: ["membership", "rbac"] }],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "Settings",
    items: [{ id: "settings", label: "Settings", path: "/app/settings", icon: "Settings" }],
  },
  {
    id: "design",
    label: "Design",
    icon: "PencilRuler",
    items: [
      { id: "blueprints", label: "Blueprints", path: "/app/blueprints", icon: "LayoutTemplate", keywords: ["intent", "design"] },
      { id: "modules", label: "Modules", path: "/app/modules", icon: "Blocks", keywords: ["catalog"] },
    ],
  },
  {
    id: "shape",
    label: "Shape",
    icon: "WandSparkles",
    items: [
      { id: "drafts", label: "Draft Sessions", path: "/app/drafts", icon: "FilePenLine", keywords: ["generate", "revise"] },
      { id: "context-packs", label: "Context Packs", path: "/app/context-packs", icon: "Library", keywords: ["context"] },
    ],
  },
  {
    id: "package",
    label: "Package",
    icon: "Package",
    items: [
      { id: "release-plans", label: "Release Plans", path: "/app/release-plans", icon: "Route", keywords: ["deploy plan"] },
      { id: "releases", label: "Releases", path: "/app/releases", icon: "PackageCheck", keywords: ["versions"] },
      { id: "registries", label: "Registries", path: "/app/registries", icon: "Database", keywords: ["sync"] },
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
      { id: "map", label: "Map", path: "/app/map", icon: "Map", keywords: ["overview"] },
    ],
  },
  {
    id: "platform",
    label: "Platform Control Plane",
    icon: "Shield",
    requiredRoles: ["platform_admin", "platform_architect"],
    items: [
      { id: "platform-tenants", label: "Tenants", path: "/app/platform/tenants", icon: "Building2", requiredRoles: ["platform_admin"] },
      { id: "platform-tenant-contacts", label: "Tenant Contacts", path: "/app/platform/tenant-contacts", icon: "Phone", requiredRoles: ["platform_admin"] },
      { id: "platform-users", label: "Users", path: "/app/platform/users", icon: "User", requiredRoles: ["platform_admin"] },
      { id: "platform-roles", label: "Roles", path: "/app/platform/roles", icon: "KeyRound", requiredRoles: ["platform_admin"] },
      { id: "platform-branding", label: "Branding", path: "/app/platform/branding", icon: "Palette", requiredRoles: ["platform_admin"] },
      { id: "platform-settings", label: "Platform Settings", path: "/app/platform/settings", icon: "SlidersHorizontal", requiredRoles: ["platform_admin"] },
      { id: "identity-providers", label: "Identity Providers", path: "/app/platform/identity-providers", icon: "IdCard", requiredRoles: ["platform_admin"] },
      { id: "oidc-app-clients", label: "OIDC App Clients", path: "/app/platform/oidc-app-clients", icon: "AppWindow", requiredRoles: ["platform_admin"] },
      { id: "secret-stores", label: "Secret Stores", path: "/app/platform/secret-stores", icon: "Vault", requiredRoles: ["platform_admin"] },
      { id: "secret-refs", label: "Secret Refs", path: "/app/platform/secret-refs", icon: "Key", requiredRoles: ["platform_admin"] },
      { id: "my-tenants", label: "My Tenants", path: "/app/my-tenants", icon: "UsersRound", requiredRoles: ["platform_admin", "platform_architect", "platform_operator"] },
      { id: "control-plane", label: "Control Plane", path: "/app/control-plane", icon: "ShieldCheck", requiredRoles: ["platform_admin", "platform_architect"] },
    ],
  },
];
