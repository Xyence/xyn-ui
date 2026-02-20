import type { AtlasNode } from "../components/help/AtlasFlow";

export type RouteHelp = {
  routeId: string;
  title: string;
  whatYouDo: string[];
  atlasNode: AtlasNode;
  nextSteps: Array<{ label: string; to: string }>;
};

const HELP_BY_ROUTE: Record<string, RouteHelp> = {
  "app.home": {
    routeId: "app.home",
    title: "Workspace Home",
    whatYouDo: ["Check workspace context", "Scan current artifacts and activity", "Start from the golden path"],
    atlasNode: "design",
    nextSteps: [
      { label: "Open Blueprints", to: "/app/blueprints" },
      { label: "Open Drafts", to: "/app/drafts" },
      { label: "View Guides", to: "/app/guides" },
    ],
  },
  "app.artifacts": {
    routeId: "app.artifacts",
    title: "Artifacts",
    whatYouDo: ["Browse governed artifacts", "Filter by type and lifecycle", "Open details and provenance"],
    atlasNode: "observe",
    nextSteps: [
      { label: "Workspace Activity", to: "/app/activity" },
      { label: "Open Guides", to: "/app/guides" },
    ],
  },
  "app.activity": {
    routeId: "app.activity",
    title: "Activity",
    whatYouDo: ["Review immutable lifecycle events", "Audit moderation and promotion actions", "Trace event actors"],
    atlasNode: "observe",
    nextSteps: [
      { label: "Artifacts", to: "/app/artifacts" },
      { label: "People & Roles", to: "/app/people-roles" },
    ],
  },
  "app.people-roles": {
    routeId: "app.people-roles",
    title: "People & Roles",
    whatYouDo: ["View workspace membership", "Assign responsibilities", "Manage governance authority"],
    atlasNode: "run",
    nextSteps: [
      { label: "Workspace Settings", to: "/app/settings" },
      { label: "Artifacts", to: "/app/artifacts" },
    ],
  },
  "app.settings": {
    routeId: "app.settings",
    title: "Settings",
    whatYouDo: ["Adjust workspace behavior", "Confirm ownership and governance defaults", "Review operational configuration"],
    atlasNode: "run",
    nextSteps: [
      { label: "People & Roles", to: "/app/people-roles" },
      { label: "Guides", to: "/app/guides" },
    ],
  },
  "app.blueprints": {
    routeId: "app.blueprints",
    title: "Blueprints",
    whatYouDo: ["Define app/service intent", "Inspect lifecycle and dev tasks", "Queue downstream generation"],
    atlasNode: "design",
    nextSteps: [
      { label: "Drafts", to: "/app/drafts" },
      { label: "Release Plans", to: "/app/release-plans" },
      { label: "Run Tour", to: "/app/guides?tour=deploy-subscriber-notes" },
    ],
  },
  "app.drafts": {
    routeId: "app.drafts",
    title: "Draft Sessions",
    whatYouDo: ["Generate draft outputs", "Revise and validate draft material", "Submit drafts into blueprint flow"],
    atlasNode: "shape",
    nextSteps: [
      { label: "Blueprints", to: "/app/blueprints" },
      { label: "Release Plans", to: "/app/release-plans" },
    ],
  },
  "app.release-plans": {
    routeId: "app.release-plans",
    title: "Release Plans",
    whatYouDo: ["Bind releases to runtime targets", "Launch governed deployments", "Track current deployment intent"],
    atlasNode: "package",
    nextSteps: [
      { label: "Releases", to: "/app/releases" },
      { label: "Instances", to: "/app/instances" },
      { label: "Runs", to: "/app/runs" },
    ],
  },
  "app.releases": {
    routeId: "app.releases",
    title: "Releases",
    whatYouDo: ["Inspect build outputs", "Manage release lifecycle", "Promote deployable artifacts"],
    atlasNode: "package",
    nextSteps: [
      { label: "Release Plans", to: "/app/release-plans" },
      { label: "Runs", to: "/app/runs" },
    ],
  },
  "app.instances": {
    routeId: "app.instances",
    title: "Instances",
    whatYouDo: ["Select runtime targets", "Inspect health and substrate status", "Validate deployment readiness"],
    atlasNode: "run",
    nextSteps: [
      { label: "Release Plans", to: "/app/release-plans" },
      { label: "Runs", to: "/app/runs" },
    ],
  },
  "app.runs": {
    routeId: "app.runs",
    title: "Runs",
    whatYouDo: ["Inspect command execution", "Read logs and artifacts", "Identify failing stages quickly"],
    atlasNode: "observe",
    nextSteps: [
      { label: "Dev Tasks", to: "/app/dev-tasks" },
      { label: "Blueprints", to: "/app/blueprints" },
    ],
  },
  "app.guides": {
    routeId: "app.guides",
    title: "Guides",
    whatYouDo: ["Read route-bound docs", "Use core concept references", "Start onboarding tours"],
    atlasNode: "design",
    nextSteps: [
      { label: "Start tour", to: "/app/guides?tour=deploy-subscriber-notes" },
      { label: "Blueprints", to: "/app/blueprints" },
    ],
  },
};

export function resolveRouteId(pathname: string): string {
  if (pathname.startsWith("/app/blueprints")) return "app.blueprints";
  if (pathname.startsWith("/app/drafts")) return "app.drafts";
  if (pathname.startsWith("/app/release-plans")) return "app.release-plans";
  if (pathname.startsWith("/app/releases")) return "app.releases";
  if (pathname.startsWith("/app/instances")) return "app.instances";
  if (pathname.startsWith("/app/runs")) return "app.runs";
  if (pathname.startsWith("/app/guides")) return "app.guides";
  if (pathname.startsWith("/app/artifacts")) return "app.artifacts";
  if (pathname.startsWith("/app/activity")) return "app.activity";
  if (pathname.startsWith("/app/people-roles")) return "app.people-roles";
  if (pathname.startsWith("/app/settings")) return "app.settings";
  return "app.home";
}

export function getRouteHelp(routeId: string): RouteHelp {
  return HELP_BY_ROUTE[routeId] || HELP_BY_ROUTE["app.home"];
}
