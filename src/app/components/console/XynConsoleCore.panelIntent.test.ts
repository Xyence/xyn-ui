import { describe, expect, it } from "vitest";
import { resolvePanelCommand } from "./XynConsoleCore";

describe("resolvePanelCommand", () => {
  it("parses list namespace artifacts", () => {
    expect(resolvePanelCommand("list core artifacts")).toEqual({
      panelKey: "artifact_list",
      params: { namespace: "core" },
    });
    expect(resolvePanelCommand("list ore artifacts")).toEqual({
      panelKey: "artifact_list",
      params: { namespace: "ore" },
    });
    expect(resolvePanelCommand("show installed artifacts")).toEqual({
      panelKey: "artifact_list",
      params: {},
    });
  });

  it("parses artifact detail/raw/files commands", () => {
    expect(resolvePanelCommand("open artifact core.authn-jwt")).toEqual({
      panelKey: "artifact_detail",
      params: { slug: "core.authn-jwt" },
    });
    expect(resolvePanelCommand("edit artifact core.authn-jwt raw")).toEqual({
      panelKey: "artifact_raw_json",
      params: { slug: "core.authn-jwt" },
    });
    expect(resolvePanelCommand("edit artifact core.authn-jwt files")).toEqual({
      panelKey: "artifact_files",
      params: { slug: "core.authn-jwt" },
    });
  });

  it("parses ems panel commands", () => {
    expect(resolvePanelCommand("show unregistered devices")).toEqual({
      panelKey: "ems_unregistered_devices",
      params: {},
    });
    expect(resolvePanelCommand("show registrations in the past 24 hours")).toEqual({
      panelKey: "ems_registrations_time",
      params: { hours: 24 },
    });
    expect(resolvePanelCommand("show device statuses")).toEqual({
      panelKey: "ems_device_statuses",
      params: {},
    });
  });
});
