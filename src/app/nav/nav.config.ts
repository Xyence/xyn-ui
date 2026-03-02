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
    items: [
      { id: "installed", label: "Installed", path: "/app/artifacts/all", icon: "Layers" },
      { id: "catalog", label: "Catalog", path: "/app/catalog", icon: "Package" },
    ],
    subgroups: [],
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
    ],
  },
];

export const CREATE_ACTIONS: CreateAction[] = [];
