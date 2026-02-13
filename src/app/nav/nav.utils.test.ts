import { beforeEach, describe, expect, it } from "vitest";
import { NAV_GROUPS, NAV_STATE_STORAGE_KEY } from "./nav.config";
import {
  canViewNavItem,
  filterNav,
  findActiveItem,
  getBreadcrumbs,
  hydrateNavState,
  persistNavState,
  visibleNav,
} from "./nav.utils";

describe("nav.utils", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("finds active item and containing group/subgroup", () => {
    const match = findActiveItem("/app/platform/identity-providers", NAV_GROUPS);
    expect(match?.groupId).toBe("control-plane");
    expect(match?.subgroupId).toBe("access-identity");
    expect(match?.item.id).toBe("identity-providers");
  });

  it("builds breadcrumbs from nav config", () => {
    const crumbs = getBreadcrumbs("/app/runs", NAV_GROUPS);
    expect(crumbs.map((entry) => entry.label)).toEqual(["Deploy & Runtime", "Runs"]);
  });

  it("persists and hydrates nav state", () => {
    persistNavState({
      expandedGroupIds: ["design", "package"],
      expandedSubgroupIds: ["access-identity"],
      collapsed: true,
    });
    const hydrated = hydrateNavState();
    expect(hydrated.expandedGroupIds).toEqual(["design", "package"]);
    expect(hydrated.expandedSubgroupIds).toEqual(["access-identity"]);
    expect(hydrated.collapsed).toBe(true);
    expect(window.localStorage.getItem(NAV_STATE_STORAGE_KEY)).toContain("expandedGroupIds");
  });

  it("filters by label/keywords and returns matches", () => {
    const filtered = filterNav(NAV_GROUPS, "oidc");
    const labels = filtered.matches.map((entry) => entry.item.label);
    expect(labels).toContain("OIDC App Clients");
    expect(filtered.groups.length).toBeGreaterThan(0);
  });

  it("RBAC visibility hides platform admin items for non-admin users", () => {
    const userNav = visibleNav(NAV_GROUPS, { roles: [] });
    const flattened = userNav.flatMap((group) => [
      ...(group.items || []),
      ...((group.subgroups || []).flatMap((subgroup) => subgroup.items)),
    ]);
    expect(flattened.some((item) => item.path === "/app/platform/secret-stores")).toBe(false);

    const adminNav = visibleNav(NAV_GROUPS, { roles: ["platform_admin"] });
    const adminFlattened = adminNav.flatMap((group) => [
      ...(group.items || []),
      ...((group.subgroups || []).flatMap((subgroup) => subgroup.items)),
    ]);
    expect(adminFlattened.some((item) => item.path === "/app/platform/secret-stores")).toBe(true);
  });

  it("supports hidden roles for specific items", () => {
    expect(canViewNavItem({ roles: ["platform_admin"] }, { hiddenRoles: ["platform_admin"] })).toBe(false);
    expect(canViewNavItem({ roles: ["platform_admin"] }, { requiredRoles: ["platform_admin"] })).toBe(true);
  });
});
