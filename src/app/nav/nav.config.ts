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
];
