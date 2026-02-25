import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import XynConsoleNode from "./XynConsoleNode";
import { XynConsoleProvider } from "../../state/xynConsoleStore";

const apiMocks = vi.hoisted(() => ({
  resolveXynIntent: vi.fn(),
  applyXynIntent: vi.fn(),
  getXynIntentOptions: vi.fn(),
}));

vi.mock("../../../api/xyn", () => ({
  resolveXynIntent: apiMocks.resolveXynIntent,
  applyXynIntent: apiMocks.applyXynIntent,
  getXynIntentOptions: apiMocks.getXynIntentOptions,
}));

function renderConsole() {
  return render(
    <MemoryRouter>
      <XynConsoleProvider>
        <XynConsoleNode />
      </XynConsoleProvider>
    </MemoryRouter>
  );
}

describe("XynConsole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("opens with Cmd/Ctrl+K and focuses input", async () => {
    renderConsole();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByPlaceholderText("Describe a draft state transition.");
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("blocks close when a proposal is pending until cancel/apply", async () => {
    apiMocks.resolveXynIntent.mockResolvedValue({
      status: "ProposedPatch",
      action_type: "ProposePatch",
      artifact_type: "ArticleDraft",
      artifact_id: "art-1",
      summary: "Patch proposal is ready.",
      proposed_patch: {
        changes: [{ field: "summary", from: "old", to: "new" }],
        patch_object: { summary: "new" },
        requires_confirmation: true,
      },
    });

    renderConsole();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const input = await screen.findByPlaceholderText("Describe a draft state transition.");
    await userEvent.type(input, "update summary");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await screen.findByText("Proposed patch");
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByText("You have a pending proposal. Apply or cancel.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Xyn Console" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Xyn Console" })).not.toBeInTheDocument());
  });

  it("supports resolve proposed patch then apply to draft-ready", async () => {
    apiMocks.resolveXynIntent.mockResolvedValue({
      status: "ProposedPatch",
      action_type: "ProposePatch",
      artifact_type: "ArticleDraft",
      artifact_id: "art-1",
      summary: "Patch proposal is ready.",
      proposed_patch: {
        changes: [{ field: "tags", from: [], to: ["governance"] }],
        patch_object: { tags: ["governance"] },
        requires_confirmation: true,
      },
    });
    apiMocks.applyXynIntent.mockResolvedValue({
      status: "DraftReady",
      action_type: "ApplyPatch",
      artifact_type: "ArticleDraft",
      artifact_id: "art-1",
      summary: "Patch applied successfully.",
    });

    renderConsole();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const input = await screen.findByPlaceholderText("Describe a draft state transition.");
    await userEvent.type(input, "add tags governance");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await screen.findByText("Proposed patch");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    await screen.findByText("Patch applied successfully.");
    expect(apiMocks.applyXynIntent).toHaveBeenCalled();
  });

  it("shows options and injects selected value", async () => {
    apiMocks.resolveXynIntent.mockResolvedValue({
      status: "MissingFields",
      action_type: "CreateDraft",
      artifact_type: "ArticleDraft",
      artifact_id: null,
      summary: "Need more fields.",
      missing_fields: [{ field: "category", reason: "required", options_available: true }],
    });
    apiMocks.getXynIntentOptions.mockResolvedValue({
      artifact_type: "ArticleDraft",
      field: "category",
      options: ["web", "guide"],
    });

    renderConsole();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByPlaceholderText("Describe a draft state transition.");
    await userEvent.type(input, "create draft");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await screen.findByText("Missing fields");
    await userEvent.click(screen.getByRole("button", { name: "Show options" }));
    const guideOption = await screen.findByRole("button", { name: "guide" });
    await userEvent.click(guideOption);

    await waitFor(() => expect(screen.getByDisplayValue(/category: guide/i)).toBeInTheDocument());
  });
});
