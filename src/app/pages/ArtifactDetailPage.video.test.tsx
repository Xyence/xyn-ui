import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArtifactDetailPage from "./ArtifactDetailPage";

const apiMocks = vi.hoisted(() => ({
  getArticle: vi.fn(),
  listArticleRevisions: vi.fn(),
  listArticleCategories: vi.fn(),
  listArticleVideoRenders: vi.fn(),
  listContextPacks: vi.fn(),
  createContextPack: vi.fn(),
  updateArticle: vi.fn(),
  createArticleRevision: vi.fn(),
  listAiAgents: vi.fn(),
  invokeAi: vi.fn(),
  transitionArticle: vi.fn(),
  initializeArticleVideo: vi.fn(),
  generateArticleVideoScript: vi.fn(),
  generateArticleVideoStoryboard: vi.fn(),
  renderArticleVideo: vi.fn(),
  retryVideoRender: vi.fn(),
  cancelVideoRender: vi.fn(),
  commentOnWorkspaceArtifact: vi.fn(),
  moderateWorkspaceComment: vi.fn(),
  reactToWorkspaceArtifact: vi.fn(),
  convertArticleHtmlToMarkdown: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ artifactId: "art-1" }),
  };
});

vi.mock("../../api/xyn", () => apiMocks);

vi.mock("../components/editor/MarkdownWysiwygEditor", () => ({
  default: ({ value, onChange }: { value: string; onChange: (next: string) => void }) => (
    <textarea aria-label="Article editor" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

vi.mock("../state/notificationsStore", () => ({
  useNotifications: () => ({ push: vi.fn() }),
}));

vi.mock("../state/operationRegistry", () => ({
  useOperations: () => ({ startOperation: vi.fn(), finishOperation: vi.fn() }),
}));

describe("ArtifactDetailPage video explainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getArticle.mockResolvedValue({
      article: {
        id: "art-1",
        workspace_id: "ws-1",
        title: "Video Article",
        slug: "video-article",
        summary: "summary",
        body_markdown: "hello",
        body_html: "",
        category: "guide",
        format: "video_explainer",
        status: "draft",
        visibility_type: "private",
        allowed_roles: [],
        tags: [],
        published_to: [],
        video_context_pack_id: "pack-1",
        video_spec_json: {
          version: 1,
          title: "Video Article",
          intent: "initial intent",
          audience: "mixed",
          tone: "clear",
          duration_seconds_target: 120,
          voice: { style: "conversational", speaker: "neutral", pace: "medium" },
          script: { draft: "", last_generated_at: null, notes: "", proposals: [] },
          storyboard: { draft: [], last_generated_at: null, notes: "", proposals: [] },
          scenes: [],
          generation: { provider: null, status: "not_started", last_render_id: null },
        },
      },
    });
    apiMocks.listArticleRevisions.mockResolvedValue({ revisions: [] });
    apiMocks.listArticleCategories.mockResolvedValue({ categories: [{ slug: "guide", name: "Guide", enabled: true }] });
    apiMocks.listArticleVideoRenders.mockResolvedValue({ renders: [] });
    apiMocks.listContextPacks.mockResolvedValue({
      context_packs: [{ id: "pack-1", name: "Explainer Pack", purpose: "video_explainer", scope: "global", version: "1.0.0", is_active: true, is_default: false }],
    });
    apiMocks.listAiAgents.mockResolvedValue({ agents: [] });
    apiMocks.updateArticle.mockResolvedValue({ article: {} });
  });

  it("renders video explainer panel and saves overview spec edits", async () => {
    render(<ArtifactDetailPage workspaceId="ws-1" workspaceRole="owner" canManageArticleLifecycle />);
    expect(await screen.findByText("Explainer Video")).toBeInTheDocument();
    await waitFor(() => expect(apiMocks.listContextPacks).toHaveBeenCalledWith({ purpose: "video_explainer", active: true }));

    const intent = screen.getByLabelText("Intent");
    await userEvent.clear(intent);
    await userEvent.type(intent, "new intent");
    await userEvent.click(screen.getByRole("button", { name: "Save video spec" }));

    await waitFor(() => expect(apiMocks.updateArticle).toHaveBeenCalled());
    const lastCall = apiMocks.updateArticle.mock.calls[apiMocks.updateArticle.mock.calls.length - 1] as [string, Record<string, unknown>];
    const [, payload] = lastCall;
    expect(payload.format).toBe("video_explainer");
    expect((payload.video_spec_json as Record<string, unknown>).intent).toBe("new intent");
  });
});
