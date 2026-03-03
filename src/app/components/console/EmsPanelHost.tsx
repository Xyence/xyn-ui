import { useEffect, useMemo, useState } from "react";
import { getEmsRegistrations, getEmsStatusCounts, listEmsDevices } from "../../../api/xyn";
import type { EmsDeviceRow, EmsRegistrationsResponse, EmsStatusCountsResponse } from "../../../api/types";

export type EmsPanelKey = "ems_unregistered_devices" | "ems_registrations_time" | "ems_device_statuses";

export type EmsPanelSpec = {
  key: EmsPanelKey;
  params?: Record<string, unknown>;
};

function formatDate(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
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

const PANEL_TITLES: Record<EmsPanelKey, string> = {
  ems_unregistered_devices: "Unregistered Devices",
  ems_registrations_time: "Registrations (Past N Hours)",
  ems_device_statuses: "Device Statuses",
};

export function panelTitleFor(key: EmsPanelKey): string {
  return PANEL_TITLES[key];
}

export default function EmsPanelHost({ panel, workspaceId }: { panel: EmsPanelSpec | null; workspaceId: string }) {
  const content = useMemo(() => {
    if (!panel) return null;
    if (panel.key === "ems_unregistered_devices") return <UnregisteredDevicesPanel />;
    if (panel.key === "ems_registrations_time") return <RegistrationsChartPanel hours={Number(panel.params?.hours || 24)} />;
    if (panel.key === "ems_device_statuses") return <DeviceStatusesPanel />;
    return null;
  }, [panel]);

  if (!panel) {
    return (
      <div className="card ems-panel-host">
        <h3>Panels</h3>
        <p className="muted">Ask the console to open a panel, for example:</p>
        <ul className="muted">
          <li>Show unregistered devices</li>
          <li>Show registrations in the past 24 hours</li>
          <li>Show device statuses</li>
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
