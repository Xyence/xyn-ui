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
    icon: "MAP",
    items: [
      {
        id: "map",
        label: "Map",
        path: "/app/map",
        icon: "MAP",
        keywords: ["overview", "network", "graph"],
      },
    ],
  },
  {
    id: "design",
    label: "Design",
    icon: "BLK",
    items: [
      { id: "blueprints", label: "Blueprints", path: "/app/blueprints", icon: "BPT", keywords: ["design"] },
      { id: "modules", label: "Modules", path: "/app/modules", icon: "MOD", keywords: ["components", "building blocks"] },
      { id: "registries", label: "Registries", path: "/app/registries", icon: "REG", keywords: ["packages", "catalog"] },
      {
        id: "context-packs",
        label: "Context Packs",
        path: "/app/context-packs",
        icon: "CTX",
        keywords: ["context", "prompts", "guidance"],
      },
    ],
  },
  {
    id: "package",
    label: "Package",
    icon: "PKG",
    items: [
      {
        id: "release-plans",
        label: "Release Plans",
        path: "/app/release-plans",
        icon: "RPL",
        keywords: ["plan", "promotion", "deploy"],
      },
      { id: "releases", label: "Releases", path: "/app/releases", icon: "REL", keywords: ["artifact", "version", "image"] },
    ],
  },
  {
    id: "deploy-runtime",
    label: "Deploy & Runtime",
    icon: "RUN",
    items: [
      { id: "instances", label: "Instances", path: "/app/instances", icon: "INS", keywords: ["runtime", "servers", "hosts"] },
      { id: "runs", label: "Runs", path: "/app/runs", icon: "JOB", keywords: ["execution", "history", "pipelines"] },
      { id: "dev-tasks", label: "Dev Tasks", path: "/app/dev-tasks", icon: "TSK", keywords: ["tasks", "queue"] },
    ],
  },
  {
    id: "observability",
    label: "Observability",
    icon: "OBS",
    items: [
      { id: "activity", label: "Activity", path: "/app/activity", icon: "ACT", keywords: ["events", "audit", "timeline"] },
    ],
  },
  {
    id: "control-plane",
    label: "Platform Control Plane",
    icon: "CTL",
    requiredRoles: ["platform_admin", "platform_architect"],
    subgroups: [
      {
        id: "environment-tenancy",
        label: "Environment & Tenancy",
        icon: "ENV",
        items: [
          {
            id: "my-tenants",
            label: "Tenants",
            path: "/app/tenants",
            icon: "TEN",
            hiddenRoles: ["platform_admin", "platform_architect"],
            keywords: ["my tenants", "membership"],
          },
          {
            id: "platform-tenants",
            label: "Tenants",
            path: "/app/platform/tenants",
            icon: "TEN",
            requiredRoles: ["platform_admin"],
            keywords: ["tenant management", "organizations"],
          },
          {
            id: "environments",
            label: "Environments",
            path: "/app/platform/environments",
            icon: "ENV",
            requiredRoles: ["platform_admin", "platform_architect"],
            keywords: ["stages", "runtime env"],
          },
        ],
      },
      {
        id: "access-identity",
        label: "Access & Identity",
        icon: "IAM",
        items: [
          { id: "users", label: "Users", path: "/app/platform/users", icon: "USR", requiredRoles: ["platform_admin"] },
          { id: "roles", label: "Roles", path: "/app/platform/roles", icon: "ROL", requiredRoles: ["platform_admin"] },
          {
            id: "identity-providers",
            label: "Identity Providers",
            path: "/app/platform/identity-providers",
            icon: "IDP",
            requiredRoles: ["platform_admin", "platform_architect"],
            keywords: ["oidc", "oauth", "sso"],
          },
          {
            id: "oidc-app-clients",
            label: "OIDC App Clients",
            path: "/app/platform/oidc-app-clients",
            icon: "OID",
            requiredRoles: ["platform_admin", "platform_architect"],
            keywords: ["oidc", "oauth clients", "applications"],
          },
        ],
      },
      {
        id: "secrets-security",
        label: "Secrets & Security",
        icon: "SEC",
        items: [
          {
            id: "secret-stores",
            label: "Secret Stores",
            path: "/app/platform/secret-stores",
            icon: "STR",
            requiredRoles: ["platform_admin"],
            keywords: ["secrets manager", "aws", "kms"],
          },
          {
            id: "secret-refs",
            label: "Secret Refs",
            path: "/app/platform/secret-refs",
            icon: "REF",
            requiredRoles: ["platform_admin"],
            keywords: ["references", "security", "secret"],
          },
        ],
      },
      {
        id: "platform-core",
        label: "Platform Core",
        icon: "PLT",
        items: [
          {
            id: "control-plane-page",
            label: "Control Plane",
            path: "/app/platform/control-plane",
            icon: "CTL",
            requiredRoles: ["platform_admin", "platform_architect"],
            keywords: ["platform", "governance"],
          },
          {
            id: "branding",
            label: "Branding",
            path: "/app/platform/branding",
            icon: "BRD",
            requiredRoles: ["platform_admin", "platform_architect"],
          },
          {
            id: "platform-settings",
            label: "Platform Settings",
            path: "/app/platform/settings",
            icon: "CFG",
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
    icon: "HLP",
    items: [
      {
        id: "guides",
        label: "Guides",
        path: "/app/platform/guides",
        icon: "DOC",
        requiredRoles: ["platform_admin", "platform_architect"],
        keywords: ["documentation", "help", "how-to"],
      },
    ],
  },
];
