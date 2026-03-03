import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { setContextMock, getEmsStatusCountsMock } = vi.hoisted(() => ({
  setContextMock: vi.fn(),
  getEmsStatusCountsMock: vi.fn(),
}));

vi.mock("../state/xynConsoleStore", () => ({
  useXynConsole: () => ({
    setContext: setContextMock,
  }),
}));

vi.mock("../components/console/XynConsoleCore", () => ({
  default: ({ onOpenPanel }: { onOpenPanel?: (panelKey: string, params?: Record<string, unknown>) => void }) => (
    <div>
      <button type="button" onClick={() => onOpenPanel?.("ems_device_statuses", {})}>
        Open Device Statuses
      </button>
    </div>
  ),
}));

vi.mock("../../api/xyn", async () => {
  const actual = await vi.importActual<typeof import("../../api/xyn")>("../../api/xyn");
  return {
    ...actual,
    getEmsStatusCounts: getEmsStatusCountsMock,
    listEmsDevices: vi.fn(),
    getEmsRegistrations: vi.fn(),
  };
});

import InitiatePage from "./InitiatePage";

describe("InitiatePage", () => {
  beforeEach(() => {
    setContextMock.mockReset();
    getEmsStatusCountsMock.mockReset();
    getEmsStatusCountsMock.mockResolvedValue({
      total: 3,
      items: [
        { state: "unregistered", count: 1 },
        { state: "online", count: 2 },
      ],
    });
  });

  it("opens EMS panel from console action", async () => {
    render(
      <MemoryRouter initialEntries={["/w/ws-123/console"]}>
        <Routes>
          <Route path="/w/:workspaceId/console" element={<InitiatePage />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Open Device Statuses" }));

    await screen.findByRole("heading", { name: "Device Statuses" });
    await screen.findByText("Workspace: ws-123");
    await waitFor(() => expect(getEmsStatusCountsMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText("unregistered")).toBeInTheDocument();
    expect(screen.getByText("online")).toBeInTheDocument();
  });
});
