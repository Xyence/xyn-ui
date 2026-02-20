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

  it("renders groups and items from nav config", () => {
    renderSidebar("/app/home");
    expect(screen.getByRole("link", { name: /^Home$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Artifacts$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^People & Roles$/i })).toBeInTheDocument();
  });

  it("auto-expands active route group/subgroup", () => {
    renderSidebar("/app/people-roles", ["admin"]);
    expect(screen.getByRole("link", { name: /People & Roles/i })).toBeInTheDocument();
  });

  it("persists collapsed mode to localStorage", async () => {
    const user = userEvent.setup();
    renderSidebar("/app/home");
    await user.click(screen.getByRole("button", { name: /Collapse sidebar/i }));
    const stored = window.localStorage.getItem(NAV_STATE_STORAGE_KEY) || "";
    expect(stored).toContain('"collapsed":true');
  });

  it("search filtering reduces visible items and expands matching groups", async () => {
    const user = userEvent.setup();
    renderSidebar("/app/home", ["admin"]);

    const search = screen.getByRole("textbox", { name: "Search" });
    await user.type(search, "artifact");

    expect(screen.getByRole("link", { name: /^Artifacts$/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^People & Roles$/i })).not.toBeInTheDocument();
  });

  it("renders without role-gated sections", async () => {
    const user = userEvent.setup();
    renderSidebar("/app/home", []);
    await user.type(screen.getByRole("textbox", { name: "Search" }), "settings");
    expect(screen.getByRole("link", { name: /^Settings$/i })).toBeInTheDocument();
  });
});
