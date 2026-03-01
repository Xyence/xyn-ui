import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArtifactsRegistryPage from "./ArtifactsRegistryPage";

const apiMocks = vi.hoisted(() => ({
  listWorkspaceArtifacts: vi.fn(),
  installWorkspaceArtifact: vi.fn(),
  uninstallWorkspaceArtifact: vi.fn(),
}));

vi.mock("../../api/xyn", () => apiMocks);

describe("ArtifactsRegistryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.listWorkspaceArtifacts.mockImplementation(async (workspaceId: string) => {
      if (workspaceId === "ws-1") {
        return {
          artifacts: [
            {
              binding_id: "b-1",
              artifact_id: "a-1",
              name: "Artifact A",
              title: "Artifact A",
              kind: "article",
              description: "First",
              enabled: true,
              installed_state: "installed",
              updated_at: "2026-03-01T00:00:00Z",
            },
          ],
        };
      }
      return {
        artifacts: [
          {
            binding_id: "b-2",
            artifact_id: "a-2",
            name: "Artifact B",
            title: "Artifact B",
            kind: "workflow",
            description: "Second",
            enabled: true,
            installed_state: "installed",
            updated_at: "2026-03-01T00:00:00Z",
          },
        ],
      };
    });
    apiMocks.installWorkspaceArtifact.mockResolvedValue({
      artifact: {
        binding_id: "b-new",
        artifact_id: "a-new",
        name: "Hello App",
        title: "Hello App",
        kind: "module",
        enabled: true,
        installed_state: "installed",
      },
      created: true,
    });
    apiMocks.uninstallWorkspaceArtifact.mockResolvedValue({
      deleted: true,
      artifact: {
        binding_id: "b-1",
        artifact_id: "a-1",
        name: "Artifact A",
        title: "Artifact A",
        kind: "article",
        enabled: true,
        installed_state: "installed",
      },
    });
  });

  it("updates list and workspace context when workspace changes", async () => {
    const { rerender } = render(
      <MemoryRouter>
        <ArtifactsRegistryPage workspaceId="ws-1" workspaceName="Workspace One" />
      </MemoryRouter>
    );

    expect(await screen.findByText("Artifact A")).toBeInTheDocument();
    expect(screen.queryByText("Artifact B")).not.toBeInTheDocument();
    expect(screen.getByText("Workspace: Workspace One")).toBeInTheDocument();
    expect(screen.getByText("Scope: Workspace")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ArtifactsRegistryPage workspaceId="ws-2" workspaceName="Workspace Two" />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Artifact B")).toBeInTheDocument());
    expect(screen.queryByText("Artifact A")).not.toBeInTheDocument();
    expect(screen.getByText("Workspace: Workspace Two")).toBeInTheDocument();
  });

  it("shows workspace empty state message", async () => {
    apiMocks.listWorkspaceArtifacts.mockResolvedValueOnce({ artifacts: [] });

    render(
      <MemoryRouter>
        <ArtifactsRegistryPage workspaceId="ws-empty" workspaceName="Empty Workspace" />
      </MemoryRouter>
    );

    expect(await screen.findByText("No artifacts installed in this workspace.")).toBeInTheDocument();
    expect(screen.getByText("You'll be able to browse and install from the Catalog in a later phase.")).toBeInTheDocument();
  });

  it("installs artifact and emits nav refresh event", async () => {
    const refreshListener = vi.fn();
    window.addEventListener("xyn:workspace-artifacts-changed", refreshListener);
    try {
      render(
        <MemoryRouter>
          <ArtifactsRegistryPage workspaceId="ws-1" workspaceName="Workspace One" />
        </MemoryRouter>
      );

      await screen.findByText("Artifact A");
      fireEvent.change(screen.getByLabelText("Artifact id or slug"), { target: { value: "xyn-hello-app" } });
      fireEvent.click(screen.getByRole("button", { name: "Install" }));

      await waitFor(() => expect(apiMocks.installWorkspaceArtifact).toHaveBeenCalledWith("ws-1", { artifact_id: "xyn-hello-app", enabled: true }));
      await waitFor(() => expect(refreshListener).toHaveBeenCalled());
    } finally {
      window.removeEventListener("xyn:workspace-artifacts-changed", refreshListener);
    }
  });
});
