import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppShell from "./AppShell";

const apiMocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  listWorkspaces: vi.fn(),
  listArtifactNavSurfaces: vi.fn(),
  getMyProfile: vi.fn(),
  getTenantBranding: vi.fn(),
}));

vi.mock("../api/xyn", () => apiMocks);

vi.mock("./state/notificationsStore", () => ({
  useNotifications: () => ({ push: vi.fn() }),
}));

vi.mock("./state/operationRegistry", () => ({
  useOperations: () => ({ runningAiCount: 0 }),
}));

vi.mock("./state/previewStore", () => ({
  usePreview: () => ({
    preview: {
      enabled: false,
      roles: [],
      read_only: true,
      started_at: null,
      expires_at: null,
      actor_roles: [],
      effective_roles: [],
    },
    disablePreviewMode: vi.fn(),
  }),
}));

vi.mock("./state/xynConsoleStore", () => ({
  useXynConsole: () => ({ handleRouteChange: vi.fn() }),
}));

vi.mock("./components/common/UserMenu", () => ({
  default: () => <div data-testid="user-menu" />,
}));

vi.mock("./components/notifications/NotificationBell", () => ({
  default: () => <div data-testid="notification-bell" />,
}));

vi.mock("./components/notifications/ToastHost", () => ({
  default: () => <div data-testid="toast-host" />,
}));

vi.mock("./components/activity/AgentActivityDrawer", () => ({
  default: () => <div data-testid="activity-drawer" />,
}));

vi.mock("./components/ReportOverlay", () => ({
  default: () => <div data-testid="report-overlay" />,
}));

vi.mock("./components/help/HelpDrawer", () => ({
  default: () => <div data-testid="help-drawer" />,
}));

vi.mock("./components/help/TourOverlay", () => ({
  default: () => <div data-testid="tour-overlay" />,
}));

vi.mock("./components/preview/HeaderPreviewControl", () => ({
  default: () => <div data-testid="preview-control" />,
}));

vi.mock("./components/preview/PreviewBanner", () => ({
  default: () => <div data-testid="preview-banner" />,
}));

vi.mock("./components/console/XynConsoleNode", () => ({
  default: () => <div data-testid="console-node" />,
}));

describe("AppShell nav surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const scrollToMock = ((..._args: unknown[]) => {}) as typeof window.scrollTo;
    if (!window.scrollTo) {
      Object.defineProperty(window, "scrollTo", { value: scrollToMock, writable: true });
    } else {
      window.scrollTo = scrollToMock;
    }
    apiMocks.getMe.mockResolvedValue({
      user: { email: "staff@example.com", subject: "staff" },
      roles: ["platform_admin"],
      permissions: [],
      actor_roles: ["platform_admin"],
      workspaces: [{ id: "ws-1", slug: "workspace-one", name: "Workspace One", role: "admin" }],
    });
    apiMocks.listWorkspaces.mockResolvedValue({ workspaces: [] });
    apiMocks.getMyProfile.mockRejectedValue(new Error("not needed"));
    apiMocks.getTenantBranding.mockRejectedValue(new Error("not needed"));
    apiMocks.listArtifactNavSurfaces.mockResolvedValue({
      surfaces: [
        {
          id: "manifest-nav-hello",
          artifact_id: "artifact-hello",
          key: "manifest-nav-hello",
          title: "Hello",
          surface_kind: "docs",
          route: "/apps/hello",
          nav_visibility: "always",
          nav_label: "Hello",
          nav_icon: "Sparkles",
          nav_group: "build",
          sort_order: 900,
        },
      ],
    });
  });

  it("renders Hello nav item from nav surfaces response", async () => {
    render(
      <MemoryRouter initialEntries={["/w/ws-1/build/artifacts"]}>
        <AppShell />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiMocks.listArtifactNavSurfaces).toHaveBeenCalledWith("ws-1"));
    expect(await screen.findByRole("button", { name: /^Apps$/i })).toBeInTheDocument();
  });
});
