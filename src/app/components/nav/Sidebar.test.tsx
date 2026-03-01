import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { NAV_STATE_STORAGE_KEY } from "../../nav/nav.config";
import Sidebar from "./Sidebar";

function renderSidebar(initialPath: string, roles: string[] = []) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<Sidebar user={{ roles }} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders groups and items from nav config", async () => {
    renderSidebar("/app/artifacts/articles");
    expect(screen.getByRole("link", { name: /^Initiate$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Artifact Explorer$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Artifacts Library$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Workspaces$/i })).toBeInTheDocument();
  });

  it("auto-expands active route group/subgroup", () => {
    renderSidebar("/app/workspaces", ["admin"]);
    expect(screen.getByRole("link", { name: /Workspaces/i })).toBeInTheDocument();
  });

  it("persists collapsed mode to localStorage", async () => {
    const user = userEvent.setup();
    renderSidebar("/app/console");
    await user.click(screen.getByRole("button", { name: /Collapse sidebar/i }));
    const stored = window.localStorage.getItem(NAV_STATE_STORAGE_KEY) || "";
    expect(stored).toContain('"collapsed":true');
  });

  it("search filtering reduces visible items and expands matching groups", async () => {
    const user = userEvent.setup();
    renderSidebar("/app/console", ["admin"]);

    const search = screen.getByRole("textbox", { name: "Search" });
    await user.type(search, "artifact");

    expect(screen.getByRole("link", { name: /^Artifact Explorer$/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Workspaces$/i })).not.toBeInTheDocument();
  });

  it("keeps role-gated settings hidden for non-admin users", async () => {
    const user = userEvent.setup();
    renderSidebar("/app/console", []);
    await user.type(screen.getByRole("textbox", { name: "Search" }), "settings");
    expect(screen.queryByRole("link", { name: /^Platform Settings$/i })).not.toBeInTheDocument();
  });
});
