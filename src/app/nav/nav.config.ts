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
    id: "shape",
    label: "Shape",
    icon: "WandSparkles",
    items: [
      { id: "drafts", label: "Draft Sessions", path: "/app/drafts", icon: "FilePenLine", keywords: ["generate", "revise"] },
      { id: "context-packs", label: "Context Packs", path: "/app/context-packs", icon: "Library", keywords: ["context"] },
    ],
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
    id: "artifacts",
    label: "Artifacts",
    icon: "BookOpen",
    items: [
      { id: "artifacts-articles", label: "Articles", path: "/app/artifacts/articles", icon: "BookOpen", keywords: ["article", "editor"] },
      { id: "artifacts-workflows", label: "Workflows", path: "/app/artifacts/workflows", icon: "Route", keywords: ["workflow", "tour"] },
      { id: "artifacts-all", label: "Artifact Explorer", path: "/app/artifacts/all", icon: "Layers", keywords: ["registry", "types"] },
    ],
  },
  {
    id: "activity",
    label: "Activity",
    icon: "Activity",
    items: [{ id: "activity", label: "Activity", path: "/app/activity", icon: "Activity", keywords: ["events", "audit"] }],
  },
  {
    id: "workspace-access",
    label: "Workspace Access",
    icon: "Users",
    items: [{ id: "workspace-access", label: "Workspace Access", path: "/app/people-roles", icon: "Users", keywords: ["membership", "rbac"] }],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "Settings",
    items: [{ id: "settings", label: "Settings", path: "/app/settings", icon: "Settings" }],
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
      { id: "tours", label: "Tours", path: "/app/tours", icon: "Route", keywords: ["onboarding", "walkthrough"] },
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
      { id: "platform-access-control", label: "Access Control", path: "/app/platform/access-control", icon: "KeyRound", requiredRoles: ["platform_admin"] },
      { id: "platform-branding", label: "Branding", path: "/app/platform/branding", icon: "Palette", requiredRoles: ["platform_admin"] },
      { id: "platform-settings", label: "Platform Settings", path: "/app/platform/settings", icon: "SlidersHorizontal", requiredRoles: ["platform_admin"] },
      { id: "platform-seeds", label: "Seed Packs", path: "/app/platform/seeds", icon: "Library", requiredRoles: ["platform_admin"] },
      { id: "identity-configuration", label: "Identity Configuration", path: "/app/platform/identity-configuration", icon: "IdCard", requiredRoles: ["platform_admin"] },
      { id: "secrets", label: "Secrets", path: "/app/platform/secrets", icon: "Vault", requiredRoles: ["platform_admin"] },
      { id: "ai-agents", label: "AI Agents", path: "/app/platform/ai-agents", icon: "Bot", requiredRoles: ["platform_admin", "platform_architect"] },
      { id: "control-plane", label: "Control Plane", path: "/app/control-plane", icon: "ShieldCheck", requiredRoles: ["platform_admin", "platform_architect"] },
    ],
  },
];
