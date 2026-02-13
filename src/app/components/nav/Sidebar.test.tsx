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
    renderSidebar("/app/map");
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Map")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
  });

  it("auto-expands active route group/subgroup", () => {
    renderSidebar("/app/platform/identity-providers", ["platform_admin"]);
    expect(screen.getByText("Platform Control Plane")).toBeInTheDocument();
    expect(screen.getByText("Access & Identity")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Identity Providers/i })).toBeInTheDocument();
  });

  it("persists collapsed mode to localStorage", async () => {
    const user = userEvent.setup();
    renderSidebar("/app/map");
    await user.click(screen.getByRole("button", { name: /Collapse sidebar/i }));
    const stored = window.localStorage.getItem(NAV_STATE_STORAGE_KEY) || "";
    expect(stored).toContain('"collapsed":true');
  });

  it("search filtering reduces visible items and expands matching groups", async () => {
    const user = userEvent.setup();
    renderSidebar("/app/map", ["platform_admin"]);

    const search = screen.getByRole("textbox", { name: "Search" });
    await user.type(search, "oidc");

    expect(screen.getByText("OIDC App Clients")).toBeInTheDocument();
    expect(screen.queryByText("Modules")).not.toBeInTheDocument();
  });

  it("hides admin-only items when user lacks role", async () => {
    const user = userEvent.setup();
    renderSidebar("/app/map", []);
    await user.type(screen.getByRole("textbox", { name: "Search" }), "secret stores");
    expect(screen.queryByText("Secret Stores")).not.toBeInTheDocument();
  });
});
