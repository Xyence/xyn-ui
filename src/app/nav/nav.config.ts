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
    id: "overview",
    label: "Overview",
    icon: "Compass",
    items: [
      {
        id: "map",
        label: "Map",
        path: "/app/map",
        icon: "Map",
        keywords: ["overview", "network", "graph"],
      },
    ],
  },
  {
    id: "design",
    label: "Design",
    icon: "Layers",
    items: [
      { id: "blueprints", label: "Blueprints", path: "/app/blueprints", icon: "Layers", keywords: ["design"] },
      {
        id: "drafts",
        label: "Drafts",
        path: "/app/drafts",
        icon: "BookOpen",
        keywords: ["draft sessions", "prompt", "voice", "planning"],
      },
      { id: "modules", label: "Modules", path: "/app/modules", icon: "Box", keywords: ["components", "building blocks"] },
      { id: "registries", label: "Registries", path: "/app/registries", icon: "Database", keywords: ["packages", "catalog"] },
      {
        id: "context-packs",
        label: "Context Packs",
        path: "/app/context-packs",
        icon: "Archive",
        keywords: ["context", "prompts", "guidance"],
      },
    ],
  },
  {
    id: "package",
    label: "Package",
    icon: "Package",
    items: [
      {
        id: "release-plans",
        label: "Release Plans",
        path: "/app/release-plans",
        icon: "GitBranch",
        keywords: ["plan", "promotion", "deploy"],
      },
      { id: "releases", label: "Releases", path: "/app/releases", icon: "Tag", keywords: ["artifact", "version", "image"] },
    ],
  },
  {
    id: "deploy-runtime",
    label: "Deploy & Runtime",
    icon: "Rocket",
    items: [
      { id: "instances", label: "Instances", path: "/app/instances", icon: "Server", keywords: ["runtime", "servers", "hosts"] },
      { id: "runs", label: "Runs", path: "/app/runs", icon: "PlayCircle", keywords: ["execution", "history", "pipelines"] },
      { id: "dev-tasks", label: "Dev Tasks", path: "/app/dev-tasks", icon: "Terminal", keywords: ["tasks", "queue"] },
    ],
  },
  {
    id: "observability",
    label: "Observability",
    icon: "Activity",
    items: [
      { id: "activity", label: "Activity", path: "/app/activity", icon: "Activity", keywords: ["events", "audit", "timeline"] },
    ],
  },
  {
    id: "control-plane",
    label: "Platform Control Plane",
    icon: "Shield",
    subgroups: [
      {
        id: "environment-tenancy",
        label: "Environment & Tenancy",
        icon: "Globe",
        items: [
          {
            id: "my-tenants",
            label: "Tenants",
            path: "/app/tenants",
            icon: "Building2",
            hiddenRoles: ["platform_admin", "platform_architect"],
            keywords: ["my tenants", "membership"],
          },
          {
            id: "platform-tenants",
            label: "Tenants",
            path: "/app/platform/tenants",
            icon: "Building2",
            requiredRoles: ["platform_admin"],
            keywords: ["tenant management", "organizations"],
          },
          {
            id: "environments",
            label: "Environments",
            path: "/app/platform/environments",
            icon: "Globe",
            requiredRoles: ["platform_admin", "platform_architect"],
            keywords: ["stages", "runtime env"],
          },
        ],
      },
      {
        id: "access-identity",
        label: "Access & Identity",
        icon: "Users",
        items: [
          { id: "users", label: "Users", path: "/app/platform/users", icon: "Users", requiredRoles: ["platform_admin"] },
          { id: "roles", label: "Roles", path: "/app/platform/roles", icon: "UserCheck", requiredRoles: ["platform_admin"] },
          {
            id: "identity-providers",
            label: "Identity Providers",
            path: "/app/platform/identity-providers",
            icon: "KeyRound",
            requiredRoles: ["platform_admin", "platform_architect"],
            keywords: ["oidc", "oauth", "sso"],
          },
          {
            id: "oidc-app-clients",
            label: "OIDC App Clients",
            path: "/app/platform/oidc-app-clients",
            icon: "ShieldCheck",
            requiredRoles: ["platform_admin", "platform_architect"],
            keywords: ["oidc", "oauth clients", "applications"],
          },
        ],
      },
      {
        id: "secrets-security",
        label: "Secrets & Security",
        icon: "Lock",
        items: [
          {
            id: "secret-stores",
            label: "Secret Stores",
            path: "/app/platform/secret-stores",
            icon: "Lock",
            requiredRoles: ["platform_admin"],
            keywords: ["secrets manager", "aws", "kms"],
          },
          {
            id: "secret-refs",
            label: "Secret Refs",
            path: "/app/platform/secret-refs",
            icon: "KeySquare",
            requiredRoles: ["platform_admin"],
            keywords: ["references", "security", "secret"],
          },
        ],
      },
      {
        id: "platform-core",
        label: "Platform Core",
        icon: "Settings",
        items: [
          {
            id: "control-plane-page",
            label: "Control Plane",
            path: "/app/platform/control-plane",
            icon: "Settings",
            requiredRoles: ["platform_admin", "platform_architect"],
            keywords: ["platform", "governance"],
          },
          {
            id: "branding",
            label: "Branding",
            path: "/app/platform/branding",
            icon: "Palette",
            requiredRoles: ["platform_admin", "platform_architect"],
          },
          {
            id: "platform-settings",
            label: "Platform Settings",
            path: "/app/platform/settings",
            icon: "SlidersHorizontal",
            requiredRoles: ["platform_admin"],
            keywords: ["notifications", "storage", "settings"],
          },
        ],
      },
    ],
  },
  {
    id: "help",
    label: "Help",
    icon: "BookOpen",
    items: [
      {
        id: "guides",
        label: "Guides",
        path: "/app/platform/guides",
        icon: "BookOpen",
        requiredRoles: ["platform_admin", "platform_architect"],
        keywords: ["documentation", "help", "how-to"],
      },
    ],
  },
];
