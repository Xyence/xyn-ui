import { useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import XynConsoleNode from "./XynConsoleNode";
import { XynConsoleProvider, useXynConsole } from "../../state/xynConsoleStore";

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

function ConsoleBridgeHarness({
  artifactId,
  onApplyPatch,
  onFocusField,
  onApplyFieldValue,
}: {
  artifactId: string;
  onApplyPatch: (patch: Record<string, unknown>) => { appliedFields: string[]; ignoredFields: string[] };
  onFocusField?: (field: string) => boolean;
  onApplyFieldValue?: (field: string, value: unknown) => boolean;
}) {
  const { setContext, registerEditorBridge, unregisterEditorBridge } = useXynConsole();

  useEffect(() => {
    const context = { artifact_id: artifactId, artifact_type: "ArticleDraft" as const };
    setContext(context);
    registerEditorBridge(context, {
      getFormSnapshot: () => ({ title: "Existing title", category: "demo", format: "standard", summary: "Current summary", tags: [], body: "Body" }),
      applyPatchToForm: onApplyPatch,
      focusField: onFocusField || (() => true),
      applyFieldValue: onApplyFieldValue,
    });
    return () => {
      unregisterEditorBridge(context);
    };
  }, [artifactId, onApplyFieldValue, onApplyPatch, onFocusField, registerEditorBridge, setContext, unregisterEditorBridge]);

  return null;
}

function renderConsoleWithBridge({
  artifactId = "art-1",
  onApplyPatch,
  onFocusField,
  onApplyFieldValue,
}: {
  artifactId?: string;
  onApplyPatch: (patch: Record<string, unknown>) => { appliedFields: string[]; ignoredFields: string[] };
  onFocusField?: (field: string) => boolean;
  onApplyFieldValue?: (field: string, value: unknown) => boolean;
}) {
  return render(
    <MemoryRouter>
      <XynConsoleProvider>
        <ConsoleBridgeHarness
          artifactId={artifactId}
          onApplyPatch={onApplyPatch}
          onFocusField={onFocusField}
          onApplyFieldValue={onApplyFieldValue}
        />
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

  it("applies proposed patch to local form without backend call", async () => {
    const onApplyPatch = vi.fn().mockReturnValue({ appliedFields: ["summary"], ignoredFields: [] });
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

    renderConsoleWithBridge({ onApplyPatch });
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByPlaceholderText("Describe a draft state transition.");
    await userEvent.type(input, "improve summary");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Proposed patch");
    await userEvent.click(screen.getByRole("button", { name: "Apply to form" }));

    expect(onApplyPatch).toHaveBeenCalledWith({ summary: "new" });
    expect(apiMocks.applyXynIntent).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getAllByText("Applied locally (unsaved).").length).toBeGreaterThan(0));
  });

  it("focuses missing field via console action", async () => {
    const onApplyPatch = vi.fn().mockReturnValue({ appliedFields: [], ignoredFields: [] });
    const onFocusField = vi.fn().mockReturnValue(true);
    apiMocks.resolveXynIntent.mockResolvedValue({
      status: "MissingFields",
      action_type: "CreateDraft",
      artifact_type: "ArticleDraft",
      artifact_id: "art-1",
      summary: "Need more fields.",
      missing_fields: [{ field: "intent", reason: "required", options_available: false }],
    });

    renderConsoleWithBridge({ onApplyPatch, onFocusField });
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByPlaceholderText("Describe a draft state transition.");
    await userEvent.type(input, "create explainer");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Missing fields");
    await userEvent.click(screen.getByRole("button", { name: "Focus field" }));
    expect(onFocusField).toHaveBeenCalledWith("intent");
  });

  it("applies option directly to form in editor context", async () => {
    const onApplyPatch = vi.fn().mockReturnValue({ appliedFields: [], ignoredFields: [] });
    const onApplyFieldValue = vi.fn().mockReturnValue(true);
    apiMocks.resolveXynIntent.mockResolvedValue({
      status: "MissingFields",
      action_type: "CreateDraft",
      artifact_type: "ArticleDraft",
      artifact_id: "art-1",
      summary: "Need more fields.",
      missing_fields: [{ field: "category", reason: "required", options_available: true }],
    });
    apiMocks.getXynIntentOptions.mockResolvedValue({
      artifact_type: "ArticleDraft",
      field: "category",
      options: ["web", "guide"],
    });

    renderConsoleWithBridge({ onApplyPatch, onApplyFieldValue });
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByPlaceholderText("Describe a draft state transition.");
    await userEvent.type(input, "create draft");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Missing fields");
    await userEvent.click(screen.getByRole("button", { name: "Show options" }));
    await userEvent.click(await screen.findByRole("button", { name: "guide" }));
    expect(onApplyFieldValue).toHaveBeenCalledWith("category", "guide");
    await screen.findByText("Applied locally (unsaved): category.");
  });
});
