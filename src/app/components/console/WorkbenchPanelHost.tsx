import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getArtifactConsoleDetailBySlug,
  getArtifactConsoleFilesBySlug,
  getEmsDatasetSchemaTable,
  getEmsRegistrationsTimeseriesCanvasTable,
  getEmsStatusRollupCanvasTable,
  queryArtifactCanvasTable,
  queryEmsDevicesCanvasTable,
  queryEmsRegistrationsCanvasTable,
} from "../../../api/xyn";
import type {
  ArtifactCanvasTableResponse,
  ArtifactConsoleDetailResponse,
  ArtifactConsoleFileRow,
  ArtifactStructuredQuery,
  CanvasTableResponse,
} from "../../../api/types";
import CanvasRenderer from "../../../components/canvas/CanvasRenderer";
import { toWorkspacePath } from "../../routing/workspaceRouting";

export type ConsolePanelKey =
  | "artifact_list"
  | "artifact_detail"
  | "artifact_raw_json"
  | "artifact_files"
  | "ems_devices"
  | "ems_registrations"
  | "ems_device_status_rollup"
  | "ems_registrations_timeseries"
  | "ems_dataset_schema"
  | "ems_unregistered_devices"
  | "ems_registrations_time"
  | "ems_device_statuses";

export type ConsolePanelSpec = {
  panel_id?: string;
  panel_type?: "table" | "detail" | "report";
  instance_key?: string;
  title?: string;
  active_group_id?: string | null;
  key: ConsolePanelKey;
  params?: Record<string, unknown>;
};

type PanelProps = {
  onOpenPanel: (panelKey: ConsolePanelKey, params?: Record<string, unknown>) => void;
};

type CanvasQuery = {
  entity: string;
  filters: Array<{ field: string; op: string; value: unknown }>;
  sort: Array<{ field: string; dir: "asc" | "desc" }>;
  limit: number;
  offset: number;
};

type ContextEmitter = (context: Record<string, unknown> | null) => void;

function baseArtifactQuery(): ArtifactStructuredQuery {
  return { entity: "artifacts", filters: [], sort: [{ field: "updated_at", dir: "desc" }], limit: 50, offset: 0 };
}

function emitTableContext({
  onContextChange,
  panel,
  payload,
  query,
  selectedRowIds,
  focusedRowId,
  rowOrderIds,
}: {
  onContextChange?: ContextEmitter;
  panel: ConsolePanelSpec | null;
  payload: CanvasTableResponse | ArtifactCanvasTableResponse | null;
  query: CanvasQuery | ArtifactStructuredQuery;
  selectedRowIds: string[];
  focusedRowId: string | null;
  rowOrderIds: string[];
}) {
  if (!onContextChange || !panel?.panel_id || !payload) return;
  onContextChange({
    view_type: "table",
    dataset: {
      name: payload.dataset.name,
      primary_key: payload.dataset.primary_key,
      columns: payload.dataset.columns,
    },
    query,
    selection: {
      selected_row_ids: selectedRowIds,
      focused_row_id: focusedRowId,
      row_order_ids: rowOrderIds,
    },
    pagination: {
      limit: Number(query.limit || 50),
      offset: Number(query.offset || 0),
      total_count: Number(payload.dataset.total_count || 0),
    },
    ui: {
      active_panel_id: panel.panel_id,
      panel_id: panel.panel_id,
      panel_type: panel.panel_type || "table",
      instance_key: panel.instance_key || payload.dataset.name,
      active_group_id: panel.active_group_id || null,
      layout_engine: "simple",
    },
  });
}

function ArtifactListPanel({
  namespace,
  workspaceId,
  query,
  queryError,
  panel,
  onContextChange,
}: {
  namespace?: string;
  workspaceId?: string;
  query?: ArtifactStructuredQuery;
  queryError?: string;
  panel: ConsolePanelSpec | null;
  onContextChange?: ContextEmitter;
}) {
  const [payload, setPayload] = useState<ArtifactCanvasTableResponse | null>(null);
  const [activeQuery, setActiveQuery] = useState<ArtifactStructuredQuery>(baseArtifactQuery());
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [rowOrderIds, setRowOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query) {
      setActiveQuery(query);
      return;
    }
    if (namespace) {
      setActiveQuery({
        ...baseArtifactQuery(),
        filters: [{ field: "namespace", op: "eq", value: namespace }],
      });
      return;
    }
    setActiveQuery(baseArtifactQuery());
  }, [namespace, query]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const next = await queryArtifactCanvasTable({ workspaceId: workspaceId || undefined, query: activeQuery });
        if (!active) return;
        setPayload(next);
        setRowOrderIds((next.dataset.rows || []).map((row, index) => String(row[next.dataset.primary_key] || index)));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load artifacts");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [activeQuery, workspaceId]);

  useEffect(() => {
    emitTableContext({ onContextChange, panel, payload, query: activeQuery, selectedRowIds, focusedRowId, rowOrderIds });
  }, [activeQuery, focusedRowId, onContextChange, panel, payload, rowOrderIds, selectedRowIds]);

  if (loading) return <p className="muted">Loading artifacts…</p>;
  if (queryError) return <p className="muted">{queryError}</p>;
  if (error) return <p className="danger-text">{error}</p>;
  if (!payload) return <p className="muted">No artifacts found.</p>;

  return (
    <CanvasRenderer
      payload={payload}
      query={activeQuery}
      onSort={(field, sortable) => {
        if (!sortable) return;
        const same = activeQuery.sort?.[0]?.field === field;
        const dir = same && activeQuery.sort?.[0]?.dir === "asc" ? "desc" : "asc";
        setActiveQuery((current) => ({ ...current, sort: [{ field, dir }] }));
      }}
      onRowActivate={(rowId) => {
        setSelectedRowIds([rowId]);
        setFocusedRowId(rowId);
      }}
    />
  );
}

function EmsCanvasPanel({
  fetcher,
  initialQuery,
  queryError,
  panel,
  onContextChange,
}: {
  fetcher: (query: CanvasQuery) => Promise<CanvasTableResponse>;
  initialQuery: CanvasQuery;
  queryError?: string;
  panel: ConsolePanelSpec | null;
  onContextChange?: ContextEmitter;
}) {
  const [payload, setPayload] = useState<CanvasTableResponse | null>(null);
  const [query, setQuery] = useState<CanvasQuery>(initialQuery);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [rowOrderIds, setRowOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const next = await fetcher(query);
        if (!active) return;
        setPayload(next);
        setRowOrderIds((next.dataset.rows || []).map((row, index) => String(row[next.dataset.primary_key] || index)));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load panel");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetcher, query]);

  useEffect(() => {
    emitTableContext({ onContextChange, panel, payload, query, selectedRowIds, focusedRowId, rowOrderIds });
  }, [focusedRowId, onContextChange, panel, payload, query, rowOrderIds, selectedRowIds]);

  if (loading) return <p className="muted">Loading…</p>;
  if (queryError) return <p className="muted">{queryError}</p>;
  if (error) return <p className="danger-text">{error}</p>;
  if (!payload) return <p className="muted">No rows.</p>;

  return (
    <CanvasRenderer
      payload={payload}
      query={query}
      onSort={(field, sortable) => {
        if (!sortable) return;
        const same = query.sort?.[0]?.field === field;
        const dir = same && query.sort?.[0]?.dir === "asc" ? "desc" : "asc";
        setQuery((current) => ({ ...current, sort: [{ field, dir }] }));
      }}
      onRowActivate={(rowId) => {
        setSelectedRowIds([rowId]);
        setFocusedRowId(rowId);
      }}
    />
  );
}

function ArtifactDetailPanel({
  slug,
  onOpenPanel,
  panel,
  onContextChange,
}: { slug: string; panel: ConsolePanelSpec | null; onContextChange?: ContextEmitter } & PanelProps) {
  const params = useParams();
  const navigate = useNavigate();
  const workspaceId = String(params.workspaceId || "").trim();
  const [payload, setPayload] = useState<ArtifactConsoleDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const next = await getArtifactConsoleDetailBySlug(slug, { workspaceId: workspaceId || undefined });
        if (!active) return;
        setPayload(next);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load artifact detail");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, workspaceId]);

  useEffect(() => {
    if (!onContextChange || !panel?.panel_id || !payload) return;
    onContextChange({
      view_type: "detail",
      entity_type: "artifact",
      entity_id: payload.artifact.slug,
      available_tabs: ["overview", "raw", "files", "manage", "docs"],
      active_tab: String(panel.params?.tab || "overview"),
      ui: {
        active_panel_id: panel.panel_id,
        panel_id: panel.panel_id,
        panel_type: panel.panel_type || "detail",
        instance_key: panel.instance_key || `artifact:${payload.artifact.slug}`,
        active_group_id: panel.active_group_id || null,
        layout_engine: "simple",
      },
    });
  }, [onContextChange, panel, payload]);

  if (loading) return <p className="muted">Loading artifact detail…</p>;
  if (error) return <p className="danger-text">{error}</p>;
  if (!payload) return <p className="muted">Artifact not found.</p>;

  const manage = payload.manifest_summary?.surfaces?.manage || [];
  const docs = payload.manifest_summary?.surfaces?.docs || [];

  const resolveSurfacePath = (path: string) => {
    const normalized = String(path || "").trim();
    if (!normalized) return "";
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (/^\/w\/[^/]+\/.+/.test(normalized)) return normalized;
    if (normalized.startsWith("/")) return workspaceId ? toWorkspacePath(workspaceId, normalized.replace(/^\/+/, "")) : normalized;
    return workspaceId ? toWorkspacePath(workspaceId, normalized) : `/${normalized}`;
  };

  const openSurfacePath = (path: string) => {
    const target = resolveSurfacePath(path);
    if (!target) return;
    if (/^https?:\/\//i.test(target)) {
      window.location.href = target;
      return;
    }
    navigate(target);
  };

  return (
    <div className="ems-panel-body">
      <p className="muted">
        {payload.artifact.slug} · {payload.artifact.kind} · v{payload.artifact.version}
      </p>
      <p className="muted small">Roles: {(payload.manifest_summary?.roles || []).join(", ") || "none"}</p>
      <div className="inline-actions">
        <button type="button" className="ghost sm" onClick={() => onOpenPanel("artifact_raw_json", { slug: payload.artifact.slug })}>
          Open Raw JSON
        </button>
        <button type="button" className="ghost sm" onClick={() => onOpenPanel("artifact_files", { slug: payload.artifact.slug })}>
          Open Files
        </button>
      </div>
      {manage.length ? (
        <div>
          <p className="small muted">Manage surfaces</p>
          <ul className="muted">
            {manage.map((entry) => (
              <li key={`${entry.path}:${entry.label}`}>
                <button type="button" className="ghost sm" onClick={() => openSurfacePath(entry.path)}>
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {docs.length ? (
        <div>
          <p className="small muted">Docs surfaces</p>
          <ul className="muted">
            {docs.map((entry) => (
              <li key={`${entry.path}:${entry.label}`}>
                <button type="button" className="ghost sm" onClick={() => openSurfacePath(entry.path)}>
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ArtifactRawJsonPanel({ slug }: { slug: string }) {
  const params = useParams();
  const workspaceId = String(params.workspaceId || "").trim();
  const [payload, setPayload] = useState<ArtifactConsoleDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const next = await getArtifactConsoleDetailBySlug(slug, { workspaceId: workspaceId || undefined });
        if (!active) return;
        setPayload(next);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load raw JSON");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, workspaceId]);

  if (loading) return <p className="muted">Loading raw JSON…</p>;
  if (error) return <p className="danger-text">{error}</p>;
  return <pre className="code-block">{JSON.stringify(payload?.raw_artifact_json || {}, null, 2)}</pre>;
}

function ArtifactFilesPanel({ slug }: { slug: string }) {
  const [rows, setRows] = useState<ArtifactConsoleFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const next = await getArtifactConsoleFilesBySlug(slug);
        if (!active) return;
        setRows(next.files || []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load files");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) return <p className="muted">Loading files…</p>;
  if (error) return <p className="danger-text">{error}</p>;

  return (
    <div className="ems-panel-body">
      <table className="canvas-table">
        <thead>
          <tr>
            <th>Path</th>
            <th>Size</th>
            <th>SHA256</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.path}>
              <td>{row.path}</td>
              <td>{row.size_bytes}</td>
              <td className="muted small">{row.sha256}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PANEL_TITLES: Record<ConsolePanelKey, string> = {
  artifact_list: "Artifact List",
  artifact_detail: "Artifact Detail",
  artifact_raw_json: "Artifact Raw JSON",
  artifact_files: "Artifact Files",
  ems_devices: "EMS Devices",
  ems_registrations: "EMS Registrations",
  ems_device_status_rollup: "EMS Device Status Rollup",
  ems_registrations_timeseries: "EMS Registrations Timeseries",
  ems_dataset_schema: "Dataset Schema",
  ems_unregistered_devices: "Unregistered Devices",
  ems_registrations_time: "Registrations (Past N Hours)",
  ems_device_statuses: "Device Statuses",
};

export function panelTitleFor(key: ConsolePanelKey): string {
  return PANEL_TITLES[key];
}

export default function WorkbenchPanelHost({
  panel,
  workspaceId,
  onOpenPanel,
  onClosePanel,
  onContextChange,
}: {
  panel: ConsolePanelSpec | null;
  workspaceId: string;
  onOpenPanel: (panel: ConsolePanelSpec) => void;
  onClosePanel?: () => void;
  onContextChange?: ContextEmitter;
}) {
  const content = useMemo(() => {
    if (!panel) return null;
    const openPanel = (panelKey: ConsolePanelKey, params?: Record<string, unknown>) => onOpenPanel({ key: panelKey, params: params || {} });

    if (panel.key === "artifact_list") {
      return (
        <ArtifactListPanel
          namespace={String(panel.params?.namespace || "")}
          workspaceId={workspaceId}
          query={(panel.params?.query as ArtifactStructuredQuery | undefined) || undefined}
          queryError={String(panel.params?.query_error || "")}
          panel={panel}
          onContextChange={onContextChange}
        />
      );
    }

    if (panel.key === "artifact_detail") {
      return <ArtifactDetailPanel slug={String(panel.params?.slug || "")} panel={panel} onContextChange={onContextChange} onOpenPanel={openPanel} />;
    }
    if (panel.key === "artifact_raw_json") return <ArtifactRawJsonPanel slug={String(panel.params?.slug || "")} />;
    if (panel.key === "artifact_files") return <ArtifactFilesPanel slug={String(panel.params?.slug || "")} />;

    if (panel.key === "ems_devices" || panel.key === "ems_unregistered_devices") {
      const query = (panel.params?.query as CanvasQuery) || {
        entity: "ems_devices",
        filters: panel.key === "ems_unregistered_devices" ? [{ field: "state", op: "eq", value: "unregistered" }] : [],
        sort: [{ field: "created_at", dir: "desc" }],
        limit: 50,
        offset: 0,
      };
      return (
        <EmsCanvasPanel
          fetcher={(nextQuery) => queryEmsDevicesCanvasTable({ query: nextQuery as never })}
          initialQuery={query}
          queryError={String(panel.params?.query_error || "")}
          panel={panel}
          onContextChange={onContextChange}
        />
      );
    }

    if (panel.key === "ems_registrations" || panel.key === "ems_registrations_time") {
      const hours = Number(panel.params?.hours || 24);
      const query = (panel.params?.query as CanvasQuery) || {
        entity: "ems_registrations",
        filters: [{ field: "registered_at", op: "gte", value: `now-${Math.max(1, Math.min(hours, 168))}h` }],
        sort: [{ field: "registered_at", dir: "desc" }],
        limit: 50,
        offset: 0,
      };
      return (
        <EmsCanvasPanel
          fetcher={(nextQuery) => queryEmsRegistrationsCanvasTable({ query: nextQuery as never })}
          initialQuery={query}
          queryError={String(panel.params?.query_error || "")}
          panel={panel}
          onContextChange={onContextChange}
        />
      );
    }

    if (panel.key === "ems_device_status_rollup" || panel.key === "ems_device_statuses") {
      return (
        <EmsCanvasPanel
          fetcher={() => getEmsStatusRollupCanvasTable()}
          initialQuery={{ entity: "ems_device_status_rollup", filters: [], sort: [{ field: "bucket", dir: "asc" }], limit: 50, offset: 0 }}
          panel={panel}
          onContextChange={onContextChange}
        />
      );
    }

    if (panel.key === "ems_registrations_timeseries") {
      const hours = Number(panel.params?.hours || 24);
      return (
        <EmsCanvasPanel
          fetcher={() => getEmsRegistrationsTimeseriesCanvasTable({ range: `now-${Math.max(1, Math.min(hours, 168))}h`, bucket: "1h" })}
          initialQuery={{
            entity: "ems_registrations_timeseries",
            filters: [{ field: "bucket_start", op: "gte", value: `now-${Math.max(1, Math.min(hours, 168))}h` }],
            sort: [{ field: "bucket_start", dir: "asc" }],
            limit: 50,
            offset: 0,
          }}
          panel={panel}
          onContextChange={onContextChange}
        />
      );
    }

    if (panel.key === "ems_dataset_schema") {
      const dataset = String(panel.params?.dataset || "ems_devices");
      return (
        <EmsCanvasPanel
          fetcher={() => getEmsDatasetSchemaTable(dataset)}
          initialQuery={{ entity: "dataset_schema", filters: [], sort: [{ field: "key", dir: "asc" }], limit: 200, offset: 0 }}
          panel={panel}
          onContextChange={onContextChange}
        />
      );
    }

    return null;
  }, [onContextChange, onOpenPanel, panel, workspaceId]);

  if (!panel) {
    return (
      <div className="card ems-panel-host">
        <h3>Panels</h3>
        <p className="muted">Ask the console to open a panel, for example:</p>
        <ul className="muted">
          <li>Show unregistered devices</li>
          <li>Show registrations in the past 24 hours</li>
          <li>Show device statuses</li>
          <li>Describe dataset ems_devices</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="card ems-panel-host">
      <div className="ems-panel-head">
        <h3>{panel.title || panelTitleFor(panel.key)}</h3>
        {onClosePanel ? (
          <button type="button" className="ghost sm" onClick={onClosePanel}>
            Close
          </button>
        ) : null}
      </div>
      {content || <p className="muted">Unknown panel.</p>}
    </div>
  );
}
