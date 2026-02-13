import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { NAV_GROUPS, NavGroup, NavUserContext } from "../../nav/nav.config";
import {
  canViewNavItem,
  filterNav,
  findActiveNavItem,
  findGroupBySubgroupId,
  flattenItems,
  hydrateNavState,
  mergedExpandedState,
  NavState,
  persistNavState,
  visibleNav,
} from "../../nav/nav.utils";

type QuickAction = {
  id: string;
  label: string;
  path: string;
  requiredRoles?: string[];
};

type Props = {
  user: NavUserContext;
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: "new-blueprint", label: "New Blueprint", path: "/app/blueprints" },
  { id: "new-release-plan", label: "New Release Plan", path: "/app/release-plans" },
  { id: "new-release", label: "New Release", path: "/app/releases" },
  { id: "new-environment", label: "New Environment", path: "/app/platform/environments", requiredRoles: ["platform_admin"] },
];

function iconText(value?: string): string {
  return (value || "•").slice(0, 3).toUpperCase();
}

function groupHasActive(group: NavGroup, pathname: string): boolean {
  return Boolean(findActiveNavItem(pathname, [group]));
}

export default function Sidebar({ user }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<NavState>(() => hydrateNavState());
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const allowedGroups = useMemo(() => visibleNav(NAV_GROUPS, user), [user]);
  const filtered = useMemo(() => filterNav(allowedGroups, query), [allowedGroups, query]);
  const expanded = useMemo(
    () => mergedExpandedState(state, pathname, filtered, allowedGroups, query),
    [state, pathname, filtered, allowedGroups, query],
  );

  useEffect(() => {
    const active = findActiveNavItem(pathname, allowedGroups);
    if (!active) return;
    const nextExpandedGroups = Array.from(new Set([...state.expandedGroups, active.groupId]));
    const nextExpandedSubgroups = active.subgroupId
      ? Array.from(new Set([...state.expandedSubgroups, active.subgroupId]))
      : state.expandedSubgroups;
    if (
      nextExpandedGroups.length === state.expandedGroups.length &&
      nextExpandedSubgroups.length === state.expandedSubgroups.length
    ) {
      return;
    }
    const next = {
      ...state,
      expandedGroups: nextExpandedGroups,
      expandedSubgroups: nextExpandedSubgroups,
    };
    setState(next);
    persistNavState(next);
  }, [pathname, allowedGroups]); // keep concise to avoid re-persist churn

  const setAndPersist = (next: NavState) => {
    setState(next);
    persistNavState(next);
  };

  const toggleGroup = (groupId: string) => {
    const has = state.expandedGroups.includes(groupId);
    const next = {
      ...state,
      expandedGroups: has
        ? state.expandedGroups.filter((value) => value !== groupId)
        : [...state.expandedGroups, groupId],
    };
    setAndPersist(next);
  };

  const toggleSubgroup = (subgroupId: string) => {
    const has = state.expandedSubgroups.includes(subgroupId);
    const next = {
      ...state,
      expandedSubgroups: has
        ? state.expandedSubgroups.filter((value) => value !== subgroupId)
        : [...state.expandedSubgroups, subgroupId],
    };
    setAndPersist(next);
  };

  const toggleCollapsed = () => {
    const next = { ...state, collapsed: !state.collapsed };
    setAndPersist(next);
    if (!next.collapsed) {
      setSearchOpen(false);
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setQuery("");
      if (state.collapsed) {
        setSearchOpen(false);
      }
      return;
    }
    if (event.key !== "Enter") return;
    if (filtered.matches.length === 1) {
      navigate(filtered.matches[0].item.path);
      if (state.collapsed) {
        setSearchOpen(false);
      }
    }
  };

  const quickActions = QUICK_ACTIONS.filter((action) => canViewNavItem(user, action));

  const filteredCount = flattenItems(filtered.groups).length;

  return (
    <aside
      className={`app-sidebar nav-sidebar ${state.collapsed ? "is-collapsed" : ""}`}
      aria-label="Sidebar Navigation"
      data-testid="xyn-sidebar"
    >
      <div className="sidebar-top">
        {!state.collapsed && (
          <label className="sidebar-search-wrap">
            <span className="sr-only">Search</span>
            <input
              className="input sidebar-search"
              placeholder="Filter..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
              aria-label="Search"
            />
          </label>
        )}
        {state.collapsed && (
          <button
            type="button"
            className="ghost sidebar-icon-button"
            title="Search"
            onClick={() => setSearchOpen((value) => !value)}
            aria-label="Open search"
          >
            SR
          </button>
        )}
        <button
          type="button"
          className="ghost sidebar-icon-button"
          onClick={toggleCollapsed}
          title={state.collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={state.collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {state.collapsed ? ">" : "<"}
        </button>
      </div>

      {state.collapsed && searchOpen && (
        <div className="sidebar-search-popover">
          <input
            autoFocus
            className="input"
            placeholder="Filter..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKeyDown}
            aria-label="Search"
          />
        </div>
      )}

      {!state.collapsed && query.trim() && (
        <div className="sidebar-filter-meta" aria-live="polite">
          {filteredCount} match{filteredCount === 1 ? "" : "es"}
        </div>
      )}

      <nav className="sidebar-scroll" aria-label="Primary">
        {filtered.groups.map((group) => {
          const groupExpanded = expanded.expandedGroups.includes(group.id);
          const groupActive = groupHasActive(group, pathname);
          return (
            <section key={group.id} className={`nav-group ${groupActive ? "active-scope" : ""}`}>
              <button
                type="button"
                className="nav-group-toggle"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={groupExpanded}
                title={state.collapsed ? group.label : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {iconText(group.icon)}
                </span>
                {!state.collapsed && <span className="nav-group-label">{group.label}</span>}
                {!state.collapsed && <span className="nav-chevron">{groupExpanded ? "-" : "+"}</span>}
              </button>

              {groupExpanded && (
                <div className="nav-group-body">
                  {(group.items || []).map((item) => (
                    <NavLink
                      key={item.id}
                      className={({ isActive }) => `app-nav-link nav-item-link ${isActive ? "active" : ""}`}
                      title={state.collapsed ? item.label : undefined}
                      to={item.path}
                    >
                      <span className="nav-icon" aria-hidden="true">
                        {iconText(item.icon)}
                      </span>
                      {!state.collapsed && <span>{item.label}</span>}
                    </NavLink>
                  ))}

                  {(group.subgroups || []).map((subgroup) => {
                    const subgroupExpanded = expanded.expandedSubgroups.includes(subgroup.id);
                    const parentGroup = findGroupBySubgroupId([group], subgroup.id);
                    const subgroupActive = parentGroup
                      ? Boolean(findActiveNavItem(pathname, [{ ...parentGroup, items: [], subgroups: [subgroup] }]))
                      : false;
                    return (
                      <div key={subgroup.id} className={`nav-subgroup ${subgroupActive ? "active-scope" : ""}`}>
                        <button
                          type="button"
                          className="nav-subgroup-toggle"
                          onClick={() => toggleSubgroup(subgroup.id)}
                          aria-expanded={subgroupExpanded}
                          title={state.collapsed ? subgroup.label : undefined}
                        >
                          <span className="nav-icon" aria-hidden="true">
                            {iconText(subgroup.icon)}
                          </span>
                          {!state.collapsed && <span className="nav-subgroup-label">{subgroup.label}</span>}
                          {!state.collapsed && <span className="nav-chevron">{subgroupExpanded ? "-" : "+"}</span>}
                        </button>
                        {subgroupExpanded && (
                          <div className="nav-subgroup-items">
                            {subgroup.items.map((item) => (
                              <NavLink
                                key={item.id}
                                className={({ isActive }) =>
                                  `app-nav-link app-nav-link-sub nav-item-link ${isActive ? "active" : ""}`
                                }
                                title={state.collapsed ? item.label : undefined}
                                to={item.path}
                              >
                                <span className="nav-icon" aria-hidden="true">
                                  {iconText(item.icon)}
                                </span>
                                {!state.collapsed && <span>{item.label}</span>}
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </nav>

      {!state.collapsed && quickActions.length > 0 && (
        <div className="sidebar-quick-actions">
          <div className="nav-section">Quick Actions</div>
          <div className="stack">
            {quickActions.map((action) => (
              <NavLink key={action.id} className="app-nav-link app-nav-link-sub nav-item-link" to={action.path}>
                {action.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
