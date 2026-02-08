import { useCallback, useEffect, useMemo, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import {
  createDevice,
  deleteDevice,
  listTenantDevices,
  listVisibleTenants,
  setActiveTenant,
  updateDevice,
} from "../../api/xyn";
import type { Device, DevicePayload, Tenant } from "../../api/types";

const emptyForm: DevicePayload = {
  name: "",
  device_type: "",
  mgmt_ip: "",
  status: "unknown",
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenantId] = useState<string>("");
  const [selected, setSelected] = useState<Device | null>(null);
  const [form, setForm] = useState<DevicePayload>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeRole = useMemo(() => {
    const match = tenants.find((t) => t.id === activeTenant);
    return (match as Tenant & { membership_role?: string }).membership_role || "";
  }, [tenants, activeTenant]);

  const canEdit =
    activeRole === "tenant_admin" || activeRole === "tenant_operator" || activeRole === "platform_admin";

  const load = useCallback(async () => {
    try {
      setError(null);
      const tenantData = await listVisibleTenants();
      setTenants(tenantData.tenants);
      if (!activeTenant && tenantData.tenants[0]) {
        const tenantId = tenantData.tenants[0].id;
        setActiveTenantId(tenantId);
        await setActiveTenant(tenantId);
      }
      const data = await listTenantDevices();
      setDevices(data.devices);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [activeTenant]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setForm(emptyForm);
      return;
    }
    setForm({
      name: selected.name,
      device_type: selected.device_type,
      mgmt_ip: selected.mgmt_ip,
      status: selected.status,
      tags: selected.tags,
      metadata_json: selected.metadata_json,
    });
  }, [selected]);

  const handleTenantChange = async (tenantId: string) => {
    setActiveTenantId(tenantId);
    await setActiveTenant(tenantId);
    setSelected(null);
    await load();
  };

  const handleSave = async () => {
    try {
      setError(null);
      setMessage(null);
      if (selected) {
        await updateDevice(selected.id, form);
        setMessage("Device updated.");
      } else {
        await createDevice(form);
        setMessage("Device created.");
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm("Delete this device?")) return;
    try {
      setError(null);
      setMessage(null);
      await deleteDevice(selected.id);
      setSelected(null);
      await load();
      setMessage("Device deleted.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Devices</h2>
          <p className="muted">Manage tenant devices.</p>
        </div>
        <div className="header-actions">
          <select value={activeTenant} onChange={(event) => handleTenantChange(event.target.value)}>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          <button className="ghost" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <div className="layout">
        <section className="card">
          <div className="card-header">
            <h3>Device list</h3>
          </div>
          <div className="instance-list">
            {devices.map((device) => (
              <button
                key={device.id}
                className={`instance-row ${selected?.id === device.id ? "active" : ""}`}
                onClick={() => setSelected(device)}
              >
                <div>
                  <strong>{device.name}</strong>
                  <span className="muted small">{device.device_type}</span>
                </div>
                <span className="muted small">{device.status}</span>
              </button>
            ))}
            {devices.length === 0 && <p className="muted">No devices yet.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>{selected ? "Device detail" : "Create device"}</h3>
          </div>
          <div className="form-grid">
            <label>
              Name
              <input
                value={form.name ?? ""}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                disabled={!canEdit}
              />
            </label>
            <label>
              Type
              <input
                value={form.device_type ?? ""}
                onChange={(event) => setForm({ ...form, device_type: event.target.value })}
                disabled={!canEdit}
              />
            </label>
            <label>
              Mgmt IP
              <input
                value={form.mgmt_ip ?? ""}
                onChange={(event) => setForm({ ...form, mgmt_ip: event.target.value })}
                disabled={!canEdit}
              />
            </label>
            <label>
              Status
              <select
                value={form.status ?? "unknown"}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                disabled={!canEdit}
              >
                <option value="active">active</option>
                <option value="offline">offline</option>
                <option value="unknown">unknown</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" onClick={handleSave} disabled={!canEdit}>
              {selected ? "Save changes" : "Create"}
            </button>
            {selected && (
              <button className="danger" onClick={handleDelete} disabled={!canEdit}>
                Delete
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
