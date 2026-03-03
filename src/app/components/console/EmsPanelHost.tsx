import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getArtifactConsoleDetailBySlug,
  getArtifactConsoleFilesBySlug,
  getEmsRegistrations,
  getEmsStatusCounts,
  listArtifactConsole,
  listEmsDevices,
} from "../../../api/xyn";
import type {
  ArtifactConsoleDetailResponse,
  ArtifactConsoleFileRow,
  ArtifactConsoleListItem,
  EmsDeviceRow,
  EmsRegistrationsResponse,
  EmsStatusCountsResponse,
} from "../../../api/types";
import { toWorkspacePath } from "../../routing/workspaceRouting";

export type ConsolePanelKey =
  | "ems_unregistered_devices"
  | "ems_registrations_time"
  | "ems_device_statuses"
  | "artifact_list"
  | "artifact_detail"
  | "artifact_raw_json"
  | "artifact_files";

export type ConsolePanelSpec = {
  key: ConsolePanelKey;
  params?: Record<string, unknown>;
};

type PanelProps = {
  onOpenPanel: (panelKey: ConsolePanelKey, params?: Record<string, unknown>) => void;
};

function formatDate(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function ArtifactListPanel({ namespace, onOpenPanel }: { namespace?: string } & PanelProps) {
  const [rows, setRows] = useState<ArtifactConsoleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const payload = await listArtifactConsole({ namespace: namespace || undefined });
        if (!active) return;
        setRows(payload.artifacts || []);
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
  }, [namespace]);
  if (loading) return <p className="muted">Loading artifacts…</p>;
  if (error) return <p className="danger-text">{error}</p>;
  return (
    <div className="ems-panel-body">
      <p className="muted">Count: {rows.length}</p>
      <table className="table">
        <thead>
          <tr>
            <th>Slug</th>
            <th>Title</th>
            <th>Kind</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <button type="button" className="ghost sm artifact-list-slug-button" onClick={() => onOpenPanel("artifact_detail", { slug: row.slug })}>
                  {row.slug}
                </button>
              </td>
              <td>{row.title}</td>
              <td>{row.kind || "-"}</td>
              <td>{formatDate(row.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArtifactDetailPanel({ slug, onOpenPanel }: { slug: string } & PanelProps) {
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
    if (normalized.startsWith("/")) {
      return workspaceId ? toWorkspacePath(workspaceId, normalized.replace(/^\/+/, "")) : normalized;
    }
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
      <table className="table">
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

function UnregisteredDevicesPanel() {
  const [rows, setRows] = useState<EmsDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const payload = await listEmsDevices("unregistered");
        if (!active) return;
        setRows(payload.items || []);
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
  }, []);
  if (loading) return <p className="muted">Loading unregistered devices…</p>;
  if (error) return <p className="danger-text">{error}</p>;
  return (
    <div className="ems-panel-body">
      <p className="muted">Count: {rows.length}</p>
      <table className="table">
        <thead>
          <tr>
            <th>MAC</th>
            <th>Serial</th>
            <th>Model</th>
            <th>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.mac}</td>
              <td>{row.serial}</td>
              <td>{row.model}</td>
              <td>{formatDate(row.last_seen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegistrationsChartPanel({ hours }: { hours: number }) {
  const [payload, setPayload] = useState<EmsRegistrationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const next = await getEmsRegistrations(hours);
        if (!active) return;
        setPayload(next);
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
  }, [hours]);

  if (loading) return <p className="muted">Loading registrations chart…</p>;
  if (error) return <p className="danger-text">{error}</p>;

  const points = payload?.points || [];
  const maxCount = points.reduce((acc, entry) => Math.max(acc, Number(entry.count || 0)), 1);
  return (
    <div className="ems-panel-body">
      <p className="muted">
        Registrations in last {payload?.hours || hours}h: <strong>{payload?.summary_count || 0}</strong>
      </p>
      <div className="ems-chart">
        {points.length ? (
          points.map((point) => {
            const widthPct = Math.max(4, Math.round((Number(point.count || 0) / maxCount) * 100));
            return (
              <div key={point.bucket} className="ems-chart-row">
                <span className="ems-chart-label">{new Date(point.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <div className="ems-chart-bar-wrap">
                  <div className="ems-chart-bar" style={{ width: `${widthPct}%` }}>
                    {point.count}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="muted">No registrations in this window.</p>
        )}
      </div>
    </div>
  );
}

function DeviceStatusesPanel() {
  const [payload, setPayload] = useState<EmsStatusCountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const next = await getEmsStatusCounts();
        if (!active) return;
        setPayload(next);
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
  }, []);
  if (loading) return <p className="muted">Loading status counts…</p>;
  if (error) return <p className="danger-text">{error}</p>;
  return (
    <div className="ems-panel-body">
      <p className="muted">Total devices: {payload?.total || 0}</p>
      <table className="table">
        <thead>
          <tr>
            <th>State</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {(payload?.items || []).map((row) => (
            <tr key={row.state}>
              <td>{row.state}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PANEL_TITLES: Record<ConsolePanelKey, string> = {
  ems_unregistered_devices: "Unregistered Devices",
  ems_registrations_time: "Registrations (Past N Hours)",
  ems_device_statuses: "Device Statuses",
  artifact_list: "Artifact List",
  artifact_detail: "Artifact Detail",
  artifact_raw_json: "Artifact Raw JSON",
  artifact_files: "Artifact Files",
};

export function panelTitleFor(key: ConsolePanelKey): string {
  return PANEL_TITLES[key];
}

export default function EmsPanelHost({ panel, workspaceId, onOpenPanel }: { panel: ConsolePanelSpec | null; workspaceId: string; onOpenPanel: (panel: ConsolePanelSpec) => void }) {
  const content = useMemo(() => {
    if (!panel) return null;
    const openPanel = (panelKey: ConsolePanelKey, params?: Record<string, unknown>) => onOpenPanel({ key: panelKey, params: params || {} });
    if (panel.key === "ems_unregistered_devices") return <UnregisteredDevicesPanel />;
    if (panel.key === "ems_registrations_time") return <RegistrationsChartPanel hours={Number(panel.params?.hours || 24)} />;
    if (panel.key === "ems_device_statuses") return <DeviceStatusesPanel />;
    if (panel.key === "artifact_list") return <ArtifactListPanel namespace={String(panel.params?.namespace || "")} onOpenPanel={openPanel} />;
    if (panel.key === "artifact_detail") return <ArtifactDetailPanel slug={String(panel.params?.slug || "")} onOpenPanel={openPanel} />;
    if (panel.key === "artifact_raw_json") return <ArtifactRawJsonPanel slug={String(panel.params?.slug || "")} />;
    if (panel.key === "artifact_files") return <ArtifactFilesPanel slug={String(panel.params?.slug || "")} />;
    return null;
  }, [panel, onOpenPanel]);

  if (!panel) {
    return (
      <div className="card ems-panel-host">
        <h3>Panels</h3>
        <p className="muted">Ask the console to open a panel, for example:</p>
        <ul className="muted">
          <li>List core artifacts</li>
          <li>Open artifact core.authn-jwt</li>
          <li>Edit artifact core.authn-jwt raw</li>
          <li>Edit artifact core.authn-jwt files</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="card ems-panel-host">
      <div className="ems-panel-head">
        <h3>{panelTitleFor(panel.key)}</h3>
        <span className="muted small">Workspace: {workspaceId || "n/a"}</span>
      </div>
      {content}
    </div>
  );
}
