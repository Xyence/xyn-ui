export type ArtifactNavGroup = "build" | "package" | "run" | "observe" | "govern";

export type ArtifactTypeRegistryEntry = {
  key: string;
  display_name: string;
  icon?: string;
  group: ArtifactNavGroup;
  default_route: string;
  create_action?: {
    id: string;
    label: string;
    path: string;
    requiredRoles?: string[];
    requiredPermissions?: string[];
  };
  children?: Array<{
    key: string;
    label: string;
    path: string;
    icon?: string;
    order?: number;
  }>;
  order: number;
};

export const ARTIFACT_TYPE_REGISTRY: ArtifactTypeRegistryEntry[] = [
  {
    key: "artifact_explorer",
    display_name: "Artifact Explorer",
    icon: "Layers",
    group: "build",
    default_route: "/app/artifacts/all",
    order: 10,
  },
  {
    key: "article",
    display_name: "Articles",
    icon: "BookOpen",
    group: "build",
    default_route: "/app/artifacts/articles",
    create_action: { id: "create-article-draft", label: "Create Article Draft", path: "/app/artifacts/articles" },
    order: 20,
  },
  {
    key: "workflow",
    display_name: "Workflows",
    icon: "Route",
    group: "build",
    default_route: "/app/artifacts/workflows",
    create_action: { id: "create-workflow", label: "Create Workflow", path: "/app/artifacts/workflows" },
    order: 30,
  },
  {
    key: "blueprint",
    display_name: "Blueprints",
    icon: "LayoutTemplate",
    group: "build",
    default_route: "/app/blueprints/versions",
    create_action: {
      id: "create-blueprint-draft",
      label: "Create Blueprint Draft",
      path: "/app/blueprints/drafts",
    },
    children: [
      { key: "blueprint-drafts", label: "Drafts", path: "/app/blueprints/drafts", icon: "FilePenLine", order: 1 },
      { key: "blueprint-versions", label: "Versions", path: "/app/blueprints/versions", icon: "GitBranch", order: 2 },
    ],
    order: 40,
  },
  {
    key: "module",
    display_name: "Modules",
    icon: "Blocks",
    group: "build",
    default_route: "/app/modules",
    create_action: { id: "create-module", label: "Create Module", path: "/app/modules" },
    order: 50,
  },
  {
    key: "context_pack",
    display_name: "Context Packs",
    icon: "Library",
    group: "build",
    default_route: "/app/context-packs",
    create_action: { id: "create-context-pack", label: "Create Context Pack", path: "/app/context-packs" },
    order: 60,
  },
];
