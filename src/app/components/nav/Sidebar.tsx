import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Archive,
  BookOpen,
  BookText,
  Box,
  Building2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Compass,
  Database,
  Globe,
  GitBranch,
  KeyRound,
  KeySquare,
  Layers,
  Lock,
  Map,
  Palette,
  Package,
  PlayCircle,
  Plus,
  Rocket,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Tag,
  UserCheck,
  Users,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { NAV_GROUPS, NavGroup, NavUserContext } from "../../nav/nav.config";
import {
  canViewNavItem,
  filterNav,
  findActiveItem,
  flattenItems,
  hydrateNavState,
  mergedExpandedState,
  NavState,
  persistNavState,
  visibleNav,
} from "../../nav/nav.utils";
import { Menu, MenuItem } from "../ui/Menu";
import Popover from "../ui/Popover";
import Tooltip from "../ui/Tooltip";
import "./sidebar.css";

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

const ICONS: Record<string, (props: { size?: number }) => ReactNode> = {
  Compass: ({ size = 18 }) => <Compass size={size} />,
  Layers: ({ size = 18 }) => <Layers size={size} />,
  Package: ({ size = 18 }) => <Package size={size} />,
  Rocket: ({ size = 18 }) => <Rocket size={size} />,
  Activity: ({ size = 18 }) => <Activity size={size} />,
  Shield: ({ size = 18 }) => <Shield size={size} />,
  BookOpen: ({ size = 18 }) => <BookOpen size={size} />,
  Map: ({ size = 18 }) => <Map size={size} />,
  Box: ({ size = 18 }) => <Box size={size} />,
  Database: ({ size = 18 }) => <Database size={size} />,
  Archive: ({ size = 18 }) => <Archive size={size} />,
  GitBranch: ({ size = 18 }) => <GitBranch size={size} />,
  Tag: ({ size = 18 }) => <Tag size={size} />,
  Server: ({ size = 18 }) => <Server size={size} />,
  PlayCircle: ({ size = 18 }) => <PlayCircle size={size} />,
  Terminal: ({ size = 18 }) => <Terminal size={size} />,
  Building2: ({ size = 18 }) => <Building2 size={size} />,
  Globe: ({ size = 18 }) => <Globe size={size} />,
  Users: ({ size = 18 }) => <Users size={size} />,
  UserCheck: ({ size = 18 }) => <UserCheck size={size} />,
  KeyRound: ({ size = 18 }) => <KeyRound size={size} />,
  ShieldCheck: ({ size = 18 }) => <ShieldCheck size={size} />,
  Lock: ({ size = 18 }) => <Lock size={size} />,
  KeySquare: ({ size = 18 }) => <KeySquare size={size} />,
  Settings: ({ size = 18 }) => <Settings size={size} />,
  Palette: ({ size = 18 }) => <Palette size={size} />,
  SlidersHorizontal: ({ size = 18 }) => <SlidersHorizontal size={size} />,
};

function renderIcon(name?: string, size = 18) {
  if (!name || !ICONS[name]) {
    return <BookText size={size} />;
  }
  return ICONS[name]({ size });
}

function groupHasActive(group: NavGroup, pathname: string): boolean {
  return Boolean(findActiveItem(pathname, [group]));
}

function NavTooltip({ content, disabled, children }: { content: string; disabled: boolean; children: ReactNode }) {
  return (
    <Tooltip content={content} disabled={disabled}>
      {children}
    </Tooltip>
  );
}

export default function Sidebar({ user }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLElement | null>(null);
  const collapsedSearchButtonRef = useRef<HTMLButtonElement | null>(null);
  const collapsedSearchPopoverRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<NavState>(() => hydrateNavState());
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [searchPopoverPos, setSearchPopoverPos] = useState<{ top: number; left: number }>({ top: 16, left: 88 });

  const allowedGroups = useMemo(() => visibleNav(NAV_GROUPS, user), [user]);
  const filtered = useMemo(() => filterNav(allowedGroups, query), [allowedGroups, query]);
  const expanded = useMemo(
    () => mergedExpandedState(state, pathname, filtered, allowedGroups, query),
    [state, pathname, filtered, allowedGroups, query],
  );

  useEffect(() => {
    const active = findActiveItem(pathname, allowedGroups);
    if (!active) return;
    const nextExpandedGroupIds = Array.from(new Set([...state.expandedGroupIds, active.groupId]));
    const nextExpandedSubgroupIds = active.subgroupId
      ? Array.from(new Set([...state.expandedSubgroupIds, active.subgroupId]))
      : state.expandedSubgroupIds;
    if (
      nextExpandedGroupIds.length === state.expandedGroupIds.length &&
      nextExpandedSubgroupIds.length === state.expandedSubgroupIds.length
    ) {
      return;
    }
    const next = {
      ...state,
      expandedGroupIds: nextExpandedGroupIds,
      expandedSubgroupIds: nextExpandedSubgroupIds,
    };
    setState(next);
    persistNavState(next);
  }, [pathname, allowedGroups]);

  const setAndPersist = (next: NavState) => {
    setState(next);
    persistNavState(next);
  };

  const toggleGroup = (groupId: string) => {
    const has = state.expandedGroupIds.includes(groupId);
    const next = {
      ...state,
      expandedGroupIds: has
        ? state.expandedGroupIds.filter((value) => value !== groupId)
        : [...state.expandedGroupIds, groupId],
    };
    setAndPersist(next);
  };

  const toggleSubgroup = (subgroupId: string) => {
    const has = state.expandedSubgroupIds.includes(subgroupId);
    const next = {
      ...state,
      expandedSubgroupIds: has
        ? state.expandedSubgroupIds.filter((value) => value !== subgroupId)
        : [...state.expandedSubgroupIds, subgroupId],
    };
    setAndPersist(next);
  };

  const toggleCollapsed = () => {
    const next = { ...state, collapsed: !state.collapsed };
    setAndPersist(next);
    if (!next.collapsed) setSearchOpen(false);
  };

  const updateScrollArrows = () => {
    const viewport = scrollRef.current;
    if (!viewport || !state.collapsed) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    setCanScrollUp(scrollTop > 2);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 2);
  };

  const updateSearchPopoverPosition = () => {
    const buttonRect = collapsedSearchButtonRef.current?.getBoundingClientRect();
    if (!buttonRect) return;
    const width = 220;
    const proposedLeft = buttonRect.right + 8;
    const maxLeft = Math.max(12, window.innerWidth - width - 12);
    setSearchPopoverPos({
      top: buttonRect.top,
      left: Math.min(proposedLeft, maxLeft),
    });
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setQuery("");
      setSearchOpen(false);
      return;
    }
    if (event.key !== "Enter") return;
    if (filtered.matches.length === 1) {
      navigate(filtered.matches[0].item.path);
      setSearchOpen(false);
    }
  };

  const quickActions = QUICK_ACTIONS.filter((action) => canViewNavItem(user, action));
  const filteredCount = flattenItems(filtered.groups).length;

  useEffect(() => {
    updateScrollArrows();
  }, [state.collapsed, filtered.groups, pathname]);

  useEffect(() => {
    if (!state.collapsed || !searchOpen) return;
    updateSearchPopoverPosition();
    const onResize = () => updateSearchPopoverPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [searchOpen, state.collapsed]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.collapsed) {
      root.classList.add("xyn-nav-collapsed");
      root.classList.remove("xyn-nav-expanded");
    } else {
      root.classList.add("xyn-nav-expanded");
      root.classList.remove("xyn-nav-collapsed");
    }
    return () => {
      root.classList.remove("xyn-nav-collapsed");
      root.classList.remove("xyn-nav-expanded");
    };
  }, [state.collapsed]);

  useEffect(() => {
    if (!searchOpen || !state.collapsed) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (collapsedSearchButtonRef.current?.contains(event.target)) return;
      if (collapsedSearchPopoverRef.current?.contains(event.target)) return;
      setSearchOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen, state.collapsed]);

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
          <NavTooltip content="Search" disabled={!state.collapsed}>
            <button
              ref={collapsedSearchButtonRef}
              type="button"
              className="ghost sidebar-icon-button"
              onClick={() => {
                const next = !searchOpen;
                setSearchOpen(next);
                if (next) {
                  updateSearchPopoverPosition();
                }
              }}
              aria-label="Open search"
            >
              <Search size={18} />
            </button>
          </NavTooltip>
        )}

        {!state.collapsed && quickActions.length > 0 && (
          <div className="sidebar-create-wrap">
            <button
              type="button"
              className="ghost sidebar-create-button"
              onClick={() => setCreateOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={createOpen}
            >
              <Plus size={16} />
              <span>Create</span>
            </button>
            <Popover open={createOpen} onClose={() => setCreateOpen(false)} className="sidebar-create-popover">
              <Menu>
                {quickActions.map((action) => (
                  <MenuItem
                    key={action.id}
                    onSelect={() => {
                      setCreateOpen(false);
                      navigate(action.path);
                    }}
                  >
                    {action.label}
                  </MenuItem>
                ))}
              </Menu>
            </Popover>
          </div>
        )}
      </div>

      {state.collapsed && (
        <div
          ref={collapsedSearchPopoverRef}
          className={`sidebar-search-popover-fixed ${searchOpen ? "open" : ""}`}
          style={{ top: `${searchPopoverPos.top}px`, left: `${searchPopoverPos.left}px` }}
        >
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

      {state.collapsed && canScrollUp && (
        <button
          type="button"
          className="ghost sidebar-scroll-arrow top"
          onClick={() => {
            scrollRef.current?.scrollBy({ top: -220, behavior: "smooth" });
          }}
          aria-label="Scroll up"
        >
          <ChevronUp size={14} />
        </button>
      )}

      <nav ref={scrollRef} className="sidebar-scroll" aria-label="Primary" onScroll={updateScrollArrows}>
        {filtered.groups.map((group) => {
          const groupExpanded = expanded.expandedGroupIds.includes(group.id);
          const groupActive = groupHasActive(group, pathname);
          return (
            <section key={group.id} className={`nav-group ${groupActive ? "active-scope" : ""}`}>
              <NavTooltip content={group.label} disabled={!state.collapsed}>
                <button
                  type="button"
                  className="nav-group-toggle"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={groupExpanded}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {renderIcon(group.icon)}
                  </span>
                  {!state.collapsed && <span className="nav-group-label">{group.label}</span>}
                  {!state.collapsed && <span className="nav-chevron">{groupExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>}
                </button>
              </NavTooltip>

              {groupExpanded && (
                <div className="nav-group-body">
                  {(group.items || []).map((item) => (
                    <NavTooltip key={item.id} content={item.label} disabled={!state.collapsed}>
                      <NavLink
                        className={({ isActive }) => `app-nav-link nav-item-link ${isActive ? "active" : ""}`}
                        to={item.path}
                      >
                        <span className="nav-icon" aria-hidden="true">
                          {renderIcon(item.icon)}
                        </span>
                        {!state.collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </NavTooltip>
                  ))}

                  {(group.subgroups || []).map((subgroup) => {
                    const subgroupExpanded = expanded.expandedSubgroupIds.includes(subgroup.id);
                    const subgroupActive = subgroup.items.some((item) => pathname.startsWith(item.path));
                    return (
                      <div key={subgroup.id} className={`nav-subgroup ${subgroupActive ? "active-scope" : ""}`}>
                        <NavTooltip content={subgroup.label} disabled={!state.collapsed}>
                          <button
                            type="button"
                            className="nav-subgroup-toggle"
                            onClick={() => toggleSubgroup(subgroup.id)}
                            aria-expanded={subgroupExpanded}
                          >
                            <span className="nav-icon" aria-hidden="true">
                              {renderIcon(subgroup.icon)}
                            </span>
                            {!state.collapsed && <span className="nav-subgroup-label">{subgroup.label}</span>}
                            {!state.collapsed && <span className="nav-chevron">{subgroupExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>}
                          </button>
                        </NavTooltip>

                        {subgroupExpanded && (
                          <div className="nav-subgroup-items">
                            {subgroup.items.map((item) => (
                              <NavTooltip key={item.id} content={item.label} disabled={!state.collapsed}>
                                <NavLink
                                  className={({ isActive }) =>
                                    `app-nav-link app-nav-link-sub nav-item-link ${isActive ? "active" : ""}`
                                  }
                                  to={item.path}
                                >
                                  <span className="nav-icon" aria-hidden="true">
                                    {renderIcon(item.icon)}
                                  </span>
                                  {!state.collapsed && <span>{item.label}</span>}
                                </NavLink>
                              </NavTooltip>
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

      {state.collapsed && canScrollDown && (
        <button
          type="button"
          className="ghost sidebar-scroll-arrow bottom"
          onClick={() => {
            scrollRef.current?.scrollBy({ top: 220, behavior: "smooth" });
          }}
          aria-label="Scroll down"
        >
          <ChevronDown size={14} />
        </button>
      )}

      <div className="sidebar-bottom-controls">
        <NavTooltip content={state.collapsed ? "Expand sidebar" : "Collapse sidebar"} disabled={!state.collapsed}>
          <button
            type="button"
            className="ghost sidebar-collapse-button"
            onClick={toggleCollapsed}
            aria-label={state.collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {state.collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!state.collapsed && <span>{state.collapsed ? "Expand" : "Collapse"}</span>}
          </button>
        </NavTooltip>
      </div>
    </aside>
  );
}
